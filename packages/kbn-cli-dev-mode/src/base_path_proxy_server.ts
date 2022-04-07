/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import { Agent as HttpsAgent, ServerOptions as TlsOptions } from 'https';
import { Server, Request } from '@hapi/hapi';
import HapiProxy from '@hapi/h2o2';
import { sampleSize } from 'lodash';
import * as Rx from 'rxjs';
import { take } from 'rxjs/operators';
import { ByteSizeValue } from '@kbn/config-schema';
import { createServer, getListenerOptions, getServerOptions } from '@kbn/server-http-tools';

import { DevConfig, HttpConfig } from './config';
import { Log } from './log';

const ONE_GIGABYTE = 1024 * 1024 * 1024;
const alphabet = 'abcdefghijklmnopqrztuvwxyz'.split('');
const getRandomBasePath = () => sampleSize(alphabet, 3).join('');

export interface BasePathProxyServerOptions {
  shouldRedirectFromOldBasePath: (path: string) => boolean;
  delayUntil: () => Rx.Observable<void>;
}

export class BasePathProxyServer {
  private readonly httpConfig: HttpConfig;
  private server?: Server;
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
    const listenerOptions = getListenerOptions(this.httpConfig);
    this.server = createServer(serverOptions, listenerOptions);

    // Register hapi plugin that adds proxying functionality. It can be configured
    // through the route configuration object (see { handler: { proxy: ... } }).
    await this.server.register([HapiProxy]);

    if (this.httpConfig.ssl.enabled) {
      const tlsOptions = serverOptions.tls as TlsOptions;
      this.httpsAgent = new HttpsAgent({
        ca: tlsOptions.ca,
        cert: tlsOptions.cert,
        key: tlsOptions.key,
        passphrase: tlsOptions.passphrase,
        rejectUnauthorized: false,
      });
    }

    this.setupRoutes(options);

    await this.server.start();

    this.log.write(
      `basepath proxy server running at ${Url.format({
        host: this.server.info.uri,
        pathname: this.httpConfig.basePath,
      })}`
    );
  }

  public async stop() {
    if (this.server === undefined) {
      return;
    }

    await this.server.stop();
    this.server = undefined;

    if (this.httpsAgent !== undefined) {
      this.httpsAgent.destroy();
      this.httpsAgent = undefined;
    }
  }

  private setupRoutes({
    delayUntil,
    shouldRedirectFromOldBasePath,
  }: Readonly<BasePathProxyServerOptions>) {
    if (this.server === undefined) {
      throw new Error(`Routes cannot be set up since server is not initialized.`);
    }

    // Always redirect from root URL to the URL with basepath.
    this.server.route({
      handler: (request, responseToolkit) => {
        return responseToolkit.redirect(this.httpConfig.basePath);
      },
      method: 'GET',
      path: '/',
    });

    this.server.route({
      handler: {
        proxy: {
          agent: this.httpsAgent,
          passThrough: true,
          xforward: true,
          mapUri: async (request: Request) => {
            return {
              // Passing in this header to merge it is a workaround until this is fixed:
              // https://github.com/hapijs/h2o2/issues/124
              headers:
                request.headers['content-length'] != null
                  ? { 'content-length': request.headers['content-length'] }
                  : undefined,
              uri: Url.format({
                hostname: request.server.info.host,
                port: this.devConfig.basePathProxyTargetPort,
                protocol: request.server.info.protocol,
                pathname: request.path,
                query: request.query,
              }),
            };
          },
        },
      },
      method: '*',
      options: {
        pre: [
          // Before we proxy request to a target port we may want to wait until some
          // condition is met (e.g. until target listener is ready).
          async (request, responseToolkit) => {
            await delayUntil().pipe(take(1)).toPromise();
            return responseToolkit.continue;
          },
        ],
        validate: { payload: true },
      },
      path: `${this.httpConfig.basePath}/{kbnPath*}`,
    });

    this.server.route({
      handler: {
        proxy: {
          agent: this.httpsAgent,
          passThrough: true,
          xforward: true,
          mapUri: async (request: Request) => ({
            uri: Url.format({
              hostname: request.server.info.host,
              port: this.devConfig.basePathProxyTargetPort,
              protocol: request.server.info.protocol,
              pathname: `${this.httpConfig.basePath}/${request.params.kbnPath}`,
              query: request.query,
            }),
            headers: request.headers,
          }),
        },
      },
      method: '*',
      options: {
        pre: [
          // Before we proxy request to a target port we may want to wait until some
          // condition is met (e.g. until target listener is ready).
          async (request, responseToolkit) => {
            await delayUntil().pipe(take(1)).toPromise();
            return responseToolkit.continue;
          },
        ],
        validate: { payload: true },
      },
      path: `/__UNSAFE_bypassBasePath/{kbnPath*}`,
    });

    // It may happen that basepath has changed, but user still uses the old one,
    // so we can try to check if that's the case and just redirect user to the
    // same URL, but with valid basepath.
    this.server.route({
      handler: (request, responseToolkit) => {
        const { oldBasePath, kbnPath = '' } = request.params;

        const isGet = request.method === 'get';
        const isBasepathLike = oldBasePath.length === 3;

        const newUrl = Url.format({
          pathname: `${this.httpConfig.basePath}/${kbnPath}`,
          query: request.query,
        });

        return isGet && isBasepathLike && shouldRedirectFromOldBasePath(kbnPath)
          ? responseToolkit.redirect(newUrl)
          : responseToolkit.response('Not Found').code(404);
      },
      method: '*',
      path: `/{oldBasePath}/{kbnPath*}`,
    });
  }
}
