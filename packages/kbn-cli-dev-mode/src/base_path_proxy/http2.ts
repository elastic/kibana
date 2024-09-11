/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { Agent as HttpsAgent, ServerOptions as TlsOptions } from 'https';
import http2, { Agent as Http2Agent, AutoRequestOptions } from 'http2-wrapper';
import http2Proxy from 'http2-proxy';
import { take } from 'rxjs';
import { getServerOptions, getServerTLSOptions } from '@kbn/server-http-tools';

import { DevConfig, HttpConfig } from '../config';
import { Log } from '../log';
import type { BasePathProxyServer, BasePathProxyServerOptions } from './types';
import { getRandomBasePath } from './utils';

export class Http2BasePathProxyServer implements BasePathProxyServer {
  private readonly httpConfig: HttpConfig;
  private server?: http2.Http2SecureServer;
  private httpsAgent?: HttpsAgent;

  constructor(
    private readonly log: Log,
    httpConfig: HttpConfig,
    private readonly devConfig: DevConfig
  ) {
    this.httpConfig = {
      ...httpConfig,
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

    await this.setupServer(options);

    this.log.write(
      `basepath proxy server running at ${Url.format({
        protocol: this.httpConfig.ssl.enabled ? 'https' : 'http',
        host: this.httpConfig.host,
        pathname: this.httpConfig.basePath,
      })}`
    );
  }

  public async stop() {
    if (this.server !== undefined) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      this.server = undefined;
    }

    if (this.httpsAgent !== undefined) {
      this.httpsAgent.destroy();
      this.httpsAgent = undefined;
    }
  }

  private async setupServer({ delayUntil }: Readonly<BasePathProxyServerOptions>) {
    const tlsOptions = getServerTLSOptions(this.httpConfig.ssl);
    this.server = http2.createSecureServer({
      ...tlsOptions,
      rejectUnauthorized: false,
      allowHTTP1: true,
    });

    const server = this.server;

    const http2Agent = new Http2Agent();

    server.on('error', (e) => {
      this.log.bad('error', `error initializing the base path server: ${e.message}`);
      throw e;
    });

    server.listen(this.httpConfig.port, this.httpConfig.host, () => {
      server.on('request', (inboundRequest, inboundResponse) => {
        const requestPath = Url.parse(inboundRequest.url).path ?? '/';

        if (requestPath === '/') {
          // Always redirect from root URL to the URL with basepath.
          inboundResponse.writeHead(302, {
            location: this.httpConfig.basePath,
          });
          inboundResponse.end();
        } else if (requestPath.startsWith(this.httpConfig.basePath!)) {
          // Perform proxy request if requested path is within base path
          http2Proxy.web(
            inboundRequest,
            inboundResponse,
            {
              protocol: 'https',
              hostname: this.httpConfig.host,
              port: this.devConfig.basePathProxyTargetPort,
              onReq: async (request, options) => {
                // Before we proxy request to a target port we may want to wait until some
                // condition is met (e.g. until target listener is ready).
                await delayUntil().pipe(take(1)).toPromise();

                const proxyOptions = {
                  ...options,
                  ...tlsOptions,
                  rejectUnauthorized: false,
                  path: options.path,
                  agent: {
                    https: this.httpsAgent ?? false,
                    http2: http2Agent,
                  },
                } as AutoRequestOptions;

                const proxyReq = await http2.auto(proxyOptions, (proxyRes) => {
                  // `http2-proxy` doesn't automatically remove pseudo-headers
                  for (const name in proxyRes.headers) {
                    if (name.startsWith(':')) {
                      delete proxyRes.headers[name];
                    }
                  }
                });

                // `http2-proxy` waits for the `socket` event before calling `h2request.end()`
                proxyReq.flushHeaders();
                return proxyReq;
              },
              onRes: async (request, response, _proxyRes) => {
                // wrong type - proxyRes is declared as Http.ServerResponse but is Http.IncomingMessage
                const proxyRes = _proxyRes as unknown as http2.IncomingMessage;
                response.setHeader('x-powered-by', 'kibana-base-path-server');
                response.writeHead(proxyRes.statusCode!, proxyRes.headers);
                proxyRes.pipe(response);
              },
            },
            (err, req, res) => {
              if (err) {
                this.log.bad('warning', 'base path proxy: error forwarding request', err);
                res.statusCode = (err as any).statusCode || 500;
                res.end((err as any).stack ?? err.message);
              }
            }
          );
        }
      });
    });
  }
}
