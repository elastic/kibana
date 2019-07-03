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

import { Server, ServerOptions } from 'hapi';

import { modifyUrl } from '../../utils';
import { Logger } from '../logging';
import { HttpConfig } from './http_config';
import { createServer, getListenerOptions, getServerOptions } from './http_tools';
import { Router } from './router';

export interface HttpServerInfo {
  server: Server;
  options: ServerOptions;
}

export class HttpServer {
  private server?: Server;
  private registeredRouters: Set<Router> = new Set();

  constructor(private readonly log: Logger) {}

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
    this.log.debug('starting http server');

    const serverOptions = getServerOptions(config);
    const listenerOptions = getListenerOptions(config);
    this.server = createServer(serverOptions, listenerOptions);

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

    await this.server.start();

    this.log.debug(
      `http server running at ${this.server.info.uri}${
        config.rewriteBasePath ? config.basePath : ''
      }`
    );

    // Return server instance with the connection options so that we can properly
    // bridge core and the "legacy" Kibana internally. Once this bridge isn't
    // needed anymore we shouldn't return anything from this method.
    return { server: this.server, options: serverOptions };
  }

  public async stop() {
    if (this.server === undefined) {
      return;
    }

    this.log.debug('stopping http server');
    await this.server.stop();
    this.server = undefined;
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
