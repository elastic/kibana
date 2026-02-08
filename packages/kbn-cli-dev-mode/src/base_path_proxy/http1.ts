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
import apm from 'elastic-apm-node';
import type { Server, Request } from '@hapi/hapi';
import HapiProxy from '@hapi/h2o2';
import { take } from 'rxjs';
import { ByteSizeValue } from '@kbn/config-schema';
import { createServer, getServerOptions } from '@kbn/server-http-tools';

import type { DevConfig, HttpConfig } from '../config';
import type { Log } from '../log';
import { getRandomBasePath } from './utils';
import type { BasePathProxyServer, BasePathProxyServerOptions } from './types';
import { generateViteShellHtml } from './vite_shell_html';
import { checkEsStatus, getElasticsearchHosts } from './check_es_status';

const ONE_GIGABYTE = 1024 * 1024 * 1024;

export class Http1BasePathProxyServer implements BasePathProxyServer {
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
    this.server = createServer(serverOptions);

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
    viteDevServerPort,
    delayUntilForAssets,
    isServerReady,
    getVitePluginIds,
  }: Readonly<BasePathProxyServerOptions>) {
    if (this.server === undefined) {
      throw new Error(`Routes cannot be set up since server is not initialized.`);
    }

    const canServeShell =
      !!viteDevServerPort && !!delayUntilForAssets && !!isServerReady && !!getVitePluginIds;

    // Always redirect from root URL to the URL with basepath.
    this.server.route({
      handler: (request, responseToolkit) => {
        return responseToolkit.redirect(this.httpConfig.basePath);
      },
      method: 'GET',
      path: '/',
    });

    // ── Internal endpoints for the shell page ──────────────────────────
    if (canServeShell) {
      // Readiness endpoint — the shell page polls this to know when the
      // Kibana server is ready. Returns 200 when ready, 503 when not.
      this.server.route({
        handler: (request, responseToolkit) => {
          if (isServerReady()) {
            return responseToolkit.response({ ready: true }).code(200);
          }
          return responseToolkit.response({ ready: false }).code(503);
        },
        method: 'GET',
        path: `${this.httpConfig.basePath}/__internal/shell_ready`,
      });

      // Elasticsearch status endpoint — the shell page calls this to
      // show whether ES is reachable. Reads configured hosts directly
      // from kibana.dev.yml / kibana.yml. Uses Node.js http/https modules
      // to handle self-signed certs (ES 8.x+ default). Also tries
      // flipping the protocol (http↔https) as a fallback.
      const esHosts = getElasticsearchHosts();
      this.server.route({
        handler: async (request, responseToolkit) => {
          const result = await checkEsStatus(esHosts);
          return responseToolkit.response(result).code(200);
        },
        method: 'GET',
        path: `${this.httpConfig.basePath}/__internal/es_status`,
      });
    }

    // ── Early asset routing to Vite ────────────────────────────────────
    // When Vite is enabled, route asset requests directly to the Vite dev
    // server (port 5173), bypassing the Kibana server entirely. This allows
    // the browser to start loading its 8000+ module requests while the
    // Kibana server is still booting — overlapping asset loading with server
    // startup instead of doing them sequentially.
    if (viteDevServerPort && delayUntilForAssets) {
      const assetDelay = delayUntilForAssets;
      const vitePort = viteDevServerPort;

      // Helper to create a Vite route definition. Vite runs plain HTTP on
      // localhost, so we always use protocol: 'http' regardless of whether
      // the proxy itself uses HTTPS.
      const createViteRoute = (
        pathPrefix: string,
        vitePathPrefix: string,
        method: string | string[] = 'GET'
      ) => {
        this.server!.route({
          handler: {
            proxy: {
              passThrough: true,
              xforward: true,
              mapUri: async (request: Request) => {
                const pathAfterBasePath = request.params.kbnPath || '';
                return {
                  uri: Url.format({
                    hostname: 'localhost',
                    port: vitePort,
                    protocol: 'http',
                    pathname: `${vitePathPrefix}${pathAfterBasePath}`,
                    query: request.query,
                  }),
                };
              },
            },
          },
          method,
          options: {
            pre: [
              // Only wait for Vite to be ready, NOT the Kibana server
              async (request, responseToolkit) => {
                apm.setTransactionName(`${request.method.toUpperCase()} /{basePath}/[vite-asset]`);
                await assetDelay().pipe(take(1)).toPromise();
                return responseToolkit.continue;
              },
            ],
          },
          path: `${this.httpConfig.basePath}/${pathPrefix}/{kbnPath*}`,
        });
      };

      // Plugin bundles served by Vite
      createViteRoute('bundles', '/bundles/');

      // Vite internal paths (@vite/client, @id/module, @fs/path)
      createViteRoute('@vite', '/@vite/');
      createViteRoute('@id', '/@id/');
      createViteRoute('@fs', '/@fs/');

      // Pre-bundled dependencies
      createViteRoute('node_modules', '/node_modules/');
    }

    this.server.route({
      handler: {
        proxy: {
          agent: this.httpsAgent,
          passThrough: true,
          xforward: true,
          mapUri: async (request: Request) => {
            return {
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
            apm.setTransactionName(`${request.method.toUpperCase()} /{basePath}/{kbnPath*}`);

            // ── Shell pre-loading for HTML requests ──────────────────
            // When the browser requests an HTML page (e.g. /app/discover)
            // and the Kibana server isn't ready yet but Vite IS, serve a
            // shell HTML that pre-loads all modules from Vite. This
            // overlaps the heavy module loading with server startup.
            if (canServeShell) {
              const accept = request.headers.accept || '';
              const isHtmlRequest = accept.includes('text/html');

              if (isHtmlRequest && !isServerReady!()) {
                // Wait for Vite to be ready
                await delayUntilForAssets!().pipe(take(1)).toPromise();

                // Double-check server isn't ready (it might have become
                // ready while we waited for Vite)
                if (!isServerReady!()) {
                  const pluginIds = getVitePluginIds!();
                  if (pluginIds && pluginIds.length > 0) {
                    const html = generateViteShellHtml({
                      basePath: this.httpConfig.basePath ?? '',
                      viteUrl: `http://localhost:${viteDevServerPort}`,
                      pluginIds,
                    });
                    return responseToolkit.response(html).type('text/html').takeover();
                  }
                }
                // Server became ready or no plugin IDs — fall through
                // to normal proxy
              }
            }

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
