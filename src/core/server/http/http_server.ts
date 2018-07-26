/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Server } from 'hapi-latest';

import { modifyUrl } from '../../utils';
import { Env } from '../config';
import { Logger } from '../logging';
import { HttpConfig } from './http_config';
import { createServer, getServerOptions } from './http_tools';
import { Router } from './router';

export class HttpServer {
  private server?: Server;
  private registeredRouters: Set<Router> = new Set();

  constructor(private readonly log: Logger, private readonly env: Env) {}

  public isListening() {
    return this.server !== undefined && this.server.listener.listening;
  }

  public registerRouter(router: Router) {
    if (this.isListening()) {
      throw new Error('Routers can be registered only when HTTP server is stopped.');
    }

    this.registeredRouters.add(router);
  }

  public async start(config: HttpConfig) {
    this.server = createServer(getServerOptions(config));

    this.setupBasePathRewrite(this.server, config);

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        this.server.route({
          handler: route.handler,
          method: route.method,
          path: this.getRouteFullPath(router.path, route.path),
        });
      }
    }

    const legacyKbnServer = this.env.getLegacyKbnServer();
    if (legacyKbnServer !== undefined) {
      legacyKbnServer.newPlatformProxyListener.bind(this.server.listener);

      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their routes, so that `legacyKbnServer`
      // handles only requests that aren't handled by the new platform.
      this.server.route({
        handler: ({ raw: { req, res } }, responseToolkit) => {
          legacyKbnServer.newPlatformProxyListener.proxy(req, res);
          return responseToolkit.abandon;
        },
        method: '*',
        options: {
          payload: {
            output: 'stream',
            parse: false,
            timeout: false,
          },
        },
        path: '/{p*}',
      });
    }

    await this.server.start();

    this.log.info(
      `Server running at ${this.server.info.uri}${config.rewriteBasePath ? config.basePath : ''}`,
      // The "legacy" Kibana will output log records with `listening` tag even if `quiet` logging mode is enabled.
      { tags: ['listening'] }
    );
  }

  public async stop() {
    this.log.info('stopping http server');

    if (this.server !== undefined) {
      await this.server.stop();
      this.server = undefined;
    }
  }

  private setupBasePathRewrite(server: Server, config: HttpConfig) {
    if (config.basePath === undefined || !config.rewriteBasePath) {
      return;
    }

    const basePath = config.basePath;
    server.ext('onRequest', (request, responseToolkit) => {
      const newURL = modifyUrl(request.url.href!, urlParts => {
        if (urlParts.pathname != null && urlParts.pathname.startsWith(basePath)) {
          urlParts.pathname = urlParts.pathname.replace(basePath, '') || '/';
        } else {
          return {};
        }
      });

      if (!newURL) {
        return responseToolkit
          .response('Not Found')
          .code(404)
          .takeover();
      }

      request.setUrl(newURL);
      // We should update raw request as well since it can be proxied to the old platform
      // where base path isn't expected.
      request.raw.req.url = request.url.href;

      return responseToolkit.continue;
    });
  }

  private getRouteFullPath(routerPath: string, routePath: string) {
    // If router's path ends with slash and route's path starts with slash,
    // we should omit one of them to have a valid concatenated path.
    const routePathStartIndex = routerPath.endsWith('/') && routePath.startsWith('/') ? 1 : 0;
    return `${routerPath}${routePath.slice(routePathStartIndex)}`;
  }
}
