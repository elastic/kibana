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

import { Request, Server, ServerOptions } from 'hapi';

import { modifyUrl } from '../../utils';
import { Logger } from '../logging';
import { HttpConfig } from './http_config';
import { createServer, getServerOptions } from './http_tools';
import { adoptToHapiAuthFormat, AuthenticationHandler } from './lifecycle/auth';
import { adoptToHapiOnRequestFormat, OnRequestHandler } from './lifecycle/on_request';
import { Router, KibanaRequest } from './router';
import {
  SessionStorageCookieOptions,
  createCookieSessionStorageFactory,
} from './cookie_session_storage';

export interface HttpServerSetup {
  server: Server;
  options: ServerOptions;
  registerRouter: (router: Router) => void;
  /**
   * Define custom authentication and/or authorization mechanism for incoming requests.
   * Applied to all resources by default. Only one AuthenticationHandler can be registered.
   */
  registerAuth: <T>(
    authenticationHandler: AuthenticationHandler<T>,
    cookieOptions: SessionStorageCookieOptions<T>
  ) => void;
  /**
   * Define custom logic to perform for incoming requests.
   * Applied to all resources by default.
   * Can register any number of OnRequestHandlers, which are called in sequence (from the first registered to the last)
   */
  registerOnRequest: (requestHandler: OnRequestHandler) => void;
  getBasePathFor: (request: KibanaRequest | Request) => string;
  setBasePathFor: (request: KibanaRequest | Request, basePath: string) => void;
}

export class HttpServer {
  private server?: Server;
  private registeredRouters = new Set<Router>();
  private authRegistered = false;
  private basePathCache = new WeakMap<
    ReturnType<KibanaRequest['unstable_getIncomingMessage']>,
    string
  >();

  constructor(private readonly log: Logger) {}

  public isListening() {
    return this.server !== undefined && this.server.listener.listening;
  }

  private registerRouter(router: Router) {
    if (this.isListening()) {
      throw new Error('Routers can be registered only when HTTP server is stopped.');
    }

    this.log.debug(`registering route handler for [${router.path}]`);
    this.registeredRouters.add(router);
  }

  // passing hapi Request works for BWC. can be deleted once we remove legacy server.
  private getBasePathFor(config: HttpConfig, request: KibanaRequest | Request) {
    const incomingMessage =
      request instanceof KibanaRequest ? request.unstable_getIncomingMessage() : request.raw.req;

    const requestScopePath = this.basePathCache.get(incomingMessage) || '';
    const serverBasePath = config.basePath || '';
    return `${serverBasePath}${requestScopePath}`;
  }

  // should work only for KibanaRequest as soon as spaces migrate to NP
  private setBasePathFor(request: KibanaRequest | Request, basePath: string) {
    const incomingMessage =
      request instanceof KibanaRequest ? request.unstable_getIncomingMessage() : request.raw.req;
    if (this.basePathCache.has(incomingMessage)) {
      throw new Error(
        'Request basePath was previously set. Setting multiple times is not supported.'
      );
    }
    this.basePathCache.set(incomingMessage, basePath);
  }

  public setup(config: HttpConfig): HttpServerSetup {
    const serverOptions = getServerOptions(config);
    this.server = createServer(serverOptions);

    return {
      options: serverOptions,
      registerRouter: this.registerRouter.bind(this),
      registerOnRequest: this.registerOnRequest.bind(this),
      registerAuth: <T>(
        fn: AuthenticationHandler<T>,
        cookieOptions: SessionStorageCookieOptions<T>
      ) => this.registerAuth(fn, cookieOptions, config.basePath),
      getBasePathFor: this.getBasePathFor.bind(this, config),
      setBasePathFor: this.setBasePathFor.bind(this),
      // Return server instance with the connection options so that we can properly
      // bridge core and the "legacy" Kibana internally. Once this bridge isn't
      // needed anymore we shouldn't return the instance from this method.
      server: this.server,
    };
  }

  public async start(config: HttpConfig) {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    this.log.debug('starting http server');

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

  private registerOnRequest(fn: OnRequestHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }

    this.server.ext('onRequest', adoptToHapiOnRequestFormat(fn));
  }

  private async registerAuth<T>(
    fn: AuthenticationHandler<T>,
    cookieOptions: SessionStorageCookieOptions<T>,
    basePath?: string
  ) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.authRegistered) {
      throw new Error('Auth interceptor was already registered');
    }
    this.authRegistered = true;

    const sessionStorage = await createCookieSessionStorageFactory<T>(
      this.server,
      cookieOptions,
      basePath
    );

    this.server.auth.scheme('login', () => ({
      authenticate: adoptToHapiAuthFormat(fn, sessionStorage),
    }));
    this.server.auth.strategy('session', 'login');

    // The default means that the `session` strategy that is based on `login` schema defined above will be
    // automatically assigned to all routes that don't contain an auth config.
    // should be applied for all routes if they don't specify auth strategy in route declaration
    // https://github.com/hapijs/hapi/blob/master/API.md#-serverauthdefaultoptions
    this.server.auth.default('session');
  }
}
