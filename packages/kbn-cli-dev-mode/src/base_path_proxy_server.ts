/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import type { ParsedUrlQuery } from 'querystring';
import { Agent as HttpsAgent, ServerOptions as TlsOptions } from 'https';
import proxy from '@fastify/http-proxy';
import apm from 'elastic-apm-node';
import type { FastifyInstance } from 'fastify';
import { sampleSize } from 'lodash';
import * as Rx from 'rxjs';
import { take } from 'rxjs/operators';
import { ByteSizeValue } from '@kbn/config-schema';
import {
  createServer,
  getCorsOptions,
  getListenerOptions,
  getServerOptions,
} from '@kbn/server-http-tools';

import { DevConfig, HttpConfig } from './config';
import { Log } from './log';

const ONE_GIGABYTE = 1024 * 1024 * 1024;
const alphabet = 'abcdefghijklmnopqrztuvwxyz'.split('');
const getRandomBasePath = () => sampleSize(alphabet, 3).join('');

interface OldBasePathParams {
  oldBasePath: string;
  kbnPath?: string;
}

export interface BasePathProxyServerOptions {
  shouldRedirectFromOldBasePath: (path: string) => boolean;
  delayUntil: () => Rx.Observable<void>;
}

export class BasePathProxyServer {
  private readonly httpConfig: HttpConfig;
  private server?: FastifyInstance;
  private httpsAgent?: HttpsAgent;

  constructor(
    private readonly log: Log,
    httpConfig: HttpConfig,
    private readonly devConfig: DevConfig
  ) {
    this.httpConfig = {
      ...httpConfig,
      maxPayload: new ByteSizeValue(ONE_GIGABYTE),
      basePath: httpConfig.basePath ?? `/${getRandomBasePath()}`,
    };
  }

  public get basePath() {
    return this.httpConfig.basePath;
  }

  public get targetPort() {
    return this.devConfig.basePathProxyTargetPort;
  }

  public get host() {
    return this.httpConfig.host;
  }

  public get port() {
    return this.httpConfig.port;
  }

  public async start(options: BasePathProxyServerOptions) {
    const serverOptions = getServerOptions(this.httpConfig);
    const corsOptions = getCorsOptions(this.httpConfig);
    const listenerOptions = getListenerOptions(this.httpConfig);
    this.server = createServer(serverOptions, corsOptions);

    if (this.httpConfig.ssl.enabled) {
      // @ts-expect-error: The property `https` isn't defined on Fastify FastifyServerOptions type, but is the official way to specify tls options
      const tlsOptions = serverOptions.https as TlsOptions;
      this.httpsAgent = new HttpsAgent({
        ca: tlsOptions.ca,
        cert: tlsOptions.cert,
        key: tlsOptions.key,
        passphrase: tlsOptions.passphrase,
        rejectUnauthorized: false,
      });
    }

    await this.setupRoutes(options);

    await this.server.listen(listenerOptions);

    this.log.write(
      `basepath proxy server running at ${Url.format({
        host: this.httpConfig.host, // TODO: Is that the same as this hapi code: `this.server.info.uri`?
        pathname: this.httpConfig.basePath,
      })}`
    );
  }

  public async stop() {
    if (this.server === undefined) {
      return;
    }

    await this.server.close();
    this.server = undefined;

    if (this.httpsAgent !== undefined) {
      this.httpsAgent.destroy();
      this.httpsAgent = undefined;
    }
  }

  private async setupRoutes({
    delayUntil,
    shouldRedirectFromOldBasePath,
  }: Readonly<BasePathProxyServerOptions>) {
    if (this.server === undefined) {
      throw new Error(`Routes cannot be set up since server is not initialized.`);
    }

    // Always redirect from root URL to the URL with basepath.
    this.server.get('/', (request, reply) => reply.redirect(this.httpConfig.basePath as string)); // TODO: Are we sure `basePath` can never be undefined? If it is, this might result in an infinite loop!

    // TODO: Convert payload validation from hapi implementation
    // TODO: `proxy` is actually an async function for some unknown reason, but I'm not sure if that's needed? So maybe we don't need the await here?
    // @ts-expect-error: TODO: figure out if this error is for real: No overload matches this call. It's only present if the `http.agents` option is used
    await this.server.register(proxy, {
      upstream: Url.format({
        protocol: this.httpConfig.ssl.enabled ? 'https' : 'http',
        hostname: this.httpConfig.host, // TODO: Is that the same as this hapi code: `request.server.info.host`?
        port: this.devConfig.basePathProxyTargetPort,
      }),
      prefix: this.httpConfig.basePath,
      http: {
        agents: {
          'http:': this.httpsAgent, // TODO: Seems like we HAVE to specify an http agent, but I'm not sure if we can get away with just reusing the https agent
          'https:': this.httpsAgent,
        },
      },
      // Before we proxy request to a target port we may want to wait until some
      // condition is met (e.g. until target listener is ready).
      async preHandler(request) {
        apm.setTransactionName(`${request.method.toUpperCase()} /{basePath}/{kbnPath*}`);
        await delayUntil().pipe(take(1)).toPromise();
      },
    });

    // TODO: Convert payload validation from hapi implementation
    // TODO: `proxy` is actually an async function for some unknown reason, but I'm not sure if that's needed? So maybe we don't need the await here?
    // @ts-expect-error: TODO: figure out if this error is for real: No overload matches this call. It's only present if the `http.agents` option is used
    await this.server.register(proxy, {
      upstream: Url.format({
        protocol: this.httpConfig.ssl.enabled ? 'https' : 'http',
        hostname: this.httpConfig.host, // TODO: Is that the same as this hapi code: `request.server.info.host`?
        port: this.devConfig.basePathProxyTargetPort,
      }),
      prefix: '/__UNSAFE_bypassBasePath',
      rewritePrefix: this.httpConfig.basePath,
      http: {
        agents: {
          'http:': this.httpsAgent, // TODO: Seems like we HAVE to specify an http agent, but I'm not sure if we can get away with just reusing the https agent
          'https:': this.httpsAgent,
        },
      },
      // Before we proxy request to a target port we may want to wait until some
      // condition is met (e.g. until target listener is ready).
      async preHandler() {
        await delayUntil().pipe(take(1)).toPromise();
      },
    });

    // It may happen that basepath has changed, but user still uses the old one,
    // so we can try to check if that's the case and just redirect user to the
    // same URL, but with valid basepath.
    this.server.all<{ Params: OldBasePathParams }>(
      `/{oldBasePath}/{kbnPath*}`,
      (request, reply) => {
        const { oldBasePath, kbnPath = '' } = request.params;

        const isGet = request.method === 'get';
        const isBasepathLike = oldBasePath.length === 3;

        if (isGet && isBasepathLike && shouldRedirectFromOldBasePath(kbnPath)) {
          reply.redirect(
            Url.format({
              pathname: `${this.httpConfig.basePath}/${kbnPath}`,
              query: request.query as ParsedUrlQuery, // `request.query` can be of other types if `querystringParser` is used: https://www.fastify.io/docs/latest/Reference/Server/#querystringparser
            })
          );
        } else {
          reply.callNotFound();
        }
      }
    );
  }
}
