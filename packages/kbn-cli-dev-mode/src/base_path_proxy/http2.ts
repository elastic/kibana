/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import type { ServerOptions as TlsOptions } from 'https';
import { Agent as HttpsAgent } from 'https';
import type { AutoRequestOptions } from 'http2-wrapper';
import http2, { Agent as Http2Agent } from 'http2-wrapper';
import http2Proxy from 'http2-proxy';
import { take } from 'rxjs';
import { getServerOptions, getServerTLSOptions } from '@kbn/server-http-tools';

import type { DevConfig, HttpConfig } from '../config';
import type { Log } from '../log';
import type { BasePathProxyServer, BasePathProxyServerOptions } from './types';
import { getRandomBasePath } from './utils';
import { generateViteShellHtml } from './vite_shell_html';
import { checkEsStatus, getElasticsearchHosts } from './check_es_status';

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

  /**
   * Check if a path (after basePath stripping) is an asset request that
   * can be served directly by Vite, bypassing the Kibana server.
   */
  private isViteAssetPath(pathAfterBasePath: string): boolean {
    return (
      pathAfterBasePath.startsWith('/bundles/') ||
      pathAfterBasePath.startsWith('/@vite/') ||
      pathAfterBasePath.startsWith('/@id/') ||
      pathAfterBasePath.startsWith('/@fs/') ||
      pathAfterBasePath.startsWith('/node_modules/')
    );
  }

  private async setupServer({
    delayUntil,
    viteDevServerPort,
    delayUntilForAssets,
    isServerReady,
    getVitePluginIds,
  }: Readonly<BasePathProxyServerOptions>) {
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

    const canServeShell =
      !!viteDevServerPort && !!delayUntilForAssets && !!isServerReady && !!getVitePluginIds;

    // Helper: proxy a request to a target (Kibana server or Vite)
    const proxyRequest = (
      inboundRequest: any,
      inboundResponse: any,
      opts: {
        protocol: string;
        hostname: string;
        port: number;
        delay: () => any;
        rewritePath?: string;
        useTls: boolean;
      }
    ) => {
      http2Proxy.web(
        inboundRequest,
        inboundResponse,
        {
          protocol: opts.protocol,
          hostname: opts.hostname,
          port: opts.port,
          onReq: async (request, options) => {
            await opts.delay().pipe(take(1)).toPromise();

            const proxyOptions = {
              ...options,
              ...(opts.useTls ? tlsOptions : {}),
              rejectUnauthorized: false,
              path: opts.rewritePath ?? options.path,
              agent: opts.useTls
                ? { https: this.httpsAgent ?? false, http2: http2Agent }
                : undefined,
            } as AutoRequestOptions;

            const proxyReq = await http2.auto(proxyOptions, (proxyRes) => {
              for (const name in proxyRes.headers) {
                if (name.startsWith(':')) {
                  delete proxyRes.headers[name];
                }
              }
            });

            proxyReq.flushHeaders();
            return proxyReq;
          },
          onRes: async (request, response, _proxyRes) => {
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
    };

    server.listen(this.httpConfig.port, this.httpConfig.host, () => {
      server.on('request', (inboundRequest, inboundResponse) => {
        const requestPath = Url.parse(inboundRequest.url).path ?? '/';

        if (requestPath === '/') {
          inboundResponse.writeHead(302, { location: this.httpConfig.basePath });
          inboundResponse.end();
          return;
        }

        // ── Internal endpoints for the shell page ────────────────
        if (
          canServeShell &&
          requestPath === `${this.httpConfig.basePath}/__internal/shell_ready`
        ) {
          const ready = isServerReady!();
          inboundResponse.writeHead(ready ? 200 : 503, {
            'content-type': 'application/json',
          });
          inboundResponse.end(JSON.stringify({ ready }));
          return;
        }

        if (
          canServeShell &&
          requestPath === `${this.httpConfig.basePath}/__internal/es_status`
        ) {
          const esHosts = getElasticsearchHosts();
          checkEsStatus(esHosts).then((result) => {
            inboundResponse.writeHead(200, { 'content-type': 'application/json' });
            inboundResponse.end(JSON.stringify(result));
          });
          return;
        }

        if (!requestPath.startsWith(this.httpConfig.basePath!)) {
          return;
        }

        const pathAfterBasePath = requestPath.slice(this.httpConfig.basePath!.length);

        // ── Shell pre-loading for HTML requests ──────────────────
        if (canServeShell) {
          const accept = (inboundRequest.headers.accept as string) || '';
          const isHtmlRequest = accept.includes('text/html');

          if (isHtmlRequest && !isServerReady!()) {
            delayUntilForAssets!()
              .pipe(take(1))
              .toPromise()
              .then(() => {
                if (!isServerReady!()) {
                  const pluginIds = getVitePluginIds!();
                  if (pluginIds && pluginIds.length > 0) {
                    const html = generateViteShellHtml({
                      basePath: this.httpConfig.basePath ?? '',
                      viteUrl: `http://localhost:${viteDevServerPort}`,
                      pluginIds,
                    });
                    inboundResponse.writeHead(200, {
                      'content-type': 'text/html; charset=utf-8',
                    });
                    inboundResponse.end(html);
                    return;
                  }
                }
                // Server became ready — proxy normally
                proxyRequest(inboundRequest, inboundResponse, {
                  protocol: 'https',
                  hostname: this.httpConfig.host,
                  port: this.devConfig.basePathProxyTargetPort,
                  delay: delayUntil,
                  useTls: true,
                });
              });
            return;
          }
        }

        // ── Asset routing to Vite / API routing to Kibana ────────
        const isAsset =
          viteDevServerPort && delayUntilForAssets && this.isViteAssetPath(pathAfterBasePath);

        if (isAsset) {
          proxyRequest(inboundRequest, inboundResponse, {
            protocol: 'http',
            hostname: 'localhost',
            port: viteDevServerPort!,
            delay: delayUntilForAssets!,
            rewritePath: pathAfterBasePath,
            useTls: false,
          });
        } else {
          proxyRequest(inboundRequest, inboundResponse, {
            protocol: 'https',
            hostname: this.httpConfig.host,
            port: this.devConfig.basePathProxyTargetPort,
            delay: delayUntil,
            useTls: true,
          });
        }
      });
    });
  }
}
