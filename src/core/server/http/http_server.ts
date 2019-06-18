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

import { Logger } from '../logging';
import { HttpConfig } from './http_config';
import { createServer, getServerOptions } from './http_tools';
import { adoptToHapiAuthFormat, AuthenticationHandler } from './lifecycle/auth';
import { adoptToHapiOnPostAuthFormat, OnPostAuthHandler } from './lifecycle/on_post_auth';
import { adoptToHapiOnPreAuthFormat, OnPreAuthHandler } from './lifecycle/on_pre_auth';
import { Router, KibanaRequest } from './router';
import {
  SessionStorageCookieOptions,
  createCookieSessionStorageFactory,
} from './cookie_session_storage';
import { SessionStorageFactory } from './session_storage';
import { AuthStateStorage } from './auth_state_storage';
import { BasePath } from './base_path_service';

export interface HttpServerSetup {
  server: Server;
  options: ServerOptions;
  registerRouter: (router: Router) => void;
  /**
   * To define custom authentication and/or authorization mechanism for incoming requests.
   * A handler should return a state to associate with the incoming request.
   * The state can be retrieved later via http.auth.get(..)
   * Only one AuthenticationHandler can be registered.
   */
  registerAuth: <T>(
    handler: AuthenticationHandler,
    cookieOptions: SessionStorageCookieOptions<T>
  ) => Promise<{ sessionStorageFactory: SessionStorageFactory<T> }>;
  /**
   * To define custom logic to perform for incoming requests. Runs the handler before Auth
   * hook performs a check that user has access to requested resources, so it's the only
   * place when you can forward a request to another URL right on the server.
   * Can register any number of registerOnPostAuth, which are called in sequence
   * (from the first registered to the last).
   */
  registerOnPreAuth: (handler: OnPreAuthHandler) => void;
  /**
   * To define custom logic to perform for incoming requests. Runs the handler after Auth hook
   * did make sure a user has access to the requested resource.
   * The auth state is available at stage via http.auth.get(..)
   * Can register any number of registerOnPreAuth, which are called in sequence
   * (from the first registered to the last).
   */
  registerOnPostAuth: (handler: OnPostAuthHandler) => void;
  basePath: {
    get: (request: KibanaRequest | Request) => string;
    set: (request: KibanaRequest | Request, basePath: string) => void;
    prepend: (url: string) => string;
    remove: (url: string) => string;
  };
  auth: {
    get: AuthStateStorage['get'];
    isAuthenticated: AuthStateStorage['isAuthenticated'];
  };
}

export class HttpServer {
  private server?: Server;
  private config?: HttpConfig;
  private registeredRouters = new Set<Router>();
  private authRegistered = false;

  private readonly authState: AuthStateStorage;

  constructor(private readonly log: Logger) {
    this.authState = new AuthStateStorage(() => this.authRegistered);
  }

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

  public setup(config: HttpConfig): HttpServerSetup {
    const serverOptions = getServerOptions(config);
    this.server = createServer(serverOptions);
    this.config = config;

    const basePathService = new BasePath(config.basePath);
    this.setupBasePathRewrite(config, basePathService);

    return {
      options: serverOptions,
      registerRouter: this.registerRouter.bind(this),
      registerOnPreAuth: this.registerOnPreAuth.bind(this),
      registerOnPostAuth: this.registerOnPostAuth.bind(this),
      registerAuth: <T>(fn: AuthenticationHandler, cookieOptions: SessionStorageCookieOptions<T>) =>
        this.registerAuth(fn, cookieOptions, config.basePath),
      basePath: basePathService,
      auth: {
        get: this.authState.get,
        isAuthenticated: this.authState.isAuthenticated,
      },
      // Return server instance with the connection options so that we can properly
      // bridge core and the "legacy" Kibana internally. Once this bridge isn't
      // needed anymore we shouldn't return the instance from this method.
      server: this.server,
    };
  }

  public async start() {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    this.log.debug('starting http server');

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        const { authRequired = true, tags } = route.options;
        this.server.route({
          handler: route.handler,
          method: route.method,
          path: this.getRouteFullPath(router.path, route.path),
          options: {
            auth: authRequired ? undefined : false,
            tags: tags ? Array.from(tags) : undefined,
          },
        });
      }
    }

    await this.server.start();
    const serverPath = this.config!.rewriteBasePath || this.config!.basePath || '';
    this.log.debug(`http server running at ${this.server.info.uri}${serverPath}`);
  }

  public async stop() {
    if (this.server === undefined) {
      return;
    }

    this.log.debug('stopping http server');
    await this.server.stop();
    this.server = undefined;
  }

  private setupBasePathRewrite(config: HttpConfig, basePathService: BasePath) {
    if (config.basePath === undefined || !config.rewriteBasePath) {
      return;
    }

    this.registerOnPreAuth((request, toolkit) => {
      const oldUrl = request.url.href!;
      const newURL = basePathService.remove(oldUrl);
      const shouldRedirect = newURL !== oldUrl;
      if (shouldRedirect) {
        return toolkit.redirected(newURL, { forward: true });
      }
      return toolkit.rejected(new Error('not found'), { statusCode: 404 });
    });
  }

  private getRouteFullPath(routerPath: string, routePath: string) {
    // If router's path ends with slash and route's path starts with slash,
    // we should omit one of them to have a valid concatenated path.
    const routePathStartIndex = routerPath.endsWith('/') && routePath.startsWith('/') ? 1 : 0;
    return `${routerPath}${routePath.slice(routePathStartIndex)}`;
  }

  private registerOnPostAuth(fn: OnPostAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }

    this.server.ext('onPostAuth', adoptToHapiOnPostAuthFormat(fn));
  }

  private registerOnPreAuth(fn: OnPreAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }

    this.server.ext('onRequest', adoptToHapiOnPreAuthFormat(fn));
  }

  private async registerAuth<T>(
    fn: AuthenticationHandler,
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

    const sessionStorageFactory = await createCookieSessionStorageFactory<T>(
      this.server,
      cookieOptions,
      basePath
    );

    this.server.auth.scheme('login', () => ({
      authenticate: adoptToHapiAuthFormat(fn, this.authState.set),
    }));
    this.server.auth.strategy('session', 'login');

    // The default means that the `session` strategy that is based on `login` schema defined above will be
    // automatically assigned to all routes that don't contain an auth config.
    // should be applied for all routes if they don't specify auth strategy in route declaration
    // https://github.com/hapijs/hapi/blob/master/API.md#-serverauthdefaultoptions
    this.server.auth.default('session');

    return { sessionStorageFactory };
  }
}
