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
import { Server } from 'hapi';
import HapiStaticFiles from 'inert';
import url from 'url';

import { Logger, LoggerFactory } from '../logging';
import { HttpConfig } from './http_config';
import { createServer, getListenerOptions, getServerOptions, getRequestId } from './http_tools';
import { adoptToHapiAuthFormat, AuthenticationHandler } from './lifecycle/auth';
import { adoptToHapiOnPreAuth, OnPreAuthHandler } from './lifecycle/on_pre_auth';
import { adoptToHapiOnPostAuthFormat, OnPostAuthHandler } from './lifecycle/on_post_auth';
import { adoptToHapiOnRequest, OnPreRoutingHandler } from './lifecycle/on_pre_routing';
import { adoptToHapiOnPreResponseFormat, OnPreResponseHandler } from './lifecycle/on_pre_response';
import {
  IRouter,
  RouteConfigOptions,
  KibanaRouteOptions,
  KibanaRequestState,
  isSafeMethod,
} from './router';
import {
  SessionStorageCookieOptions,
  createCookieSessionStorageFactory,
} from './cookie_session_storage';
import { IsAuthenticated, AuthStateStorage, GetAuthState } from './auth_state_storage';
import { AuthHeadersStorage, GetAuthHeaders } from './auth_headers_storage';
import { BasePath } from './base_path_service';
import { HttpServiceSetup, HttpServerInfo } from './types';

/** @internal */
export interface HttpServerSetup {
  server: Server;
  /**
   * Add all the routes registered with `router` to HTTP server request listeners.
   * @param router {@link IRouter} - a router with registered route handlers.
   */
  registerRouter: (router: IRouter) => void;
  registerStaticDir: (path: string, dirPath: string) => void;
  basePath: HttpServiceSetup['basePath'];
  csp: HttpServiceSetup['csp'];
  createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
  registerOnPreRouting: HttpServiceSetup['registerOnPreRouting'];
  registerOnPreAuth: HttpServiceSetup['registerOnPreAuth'];
  registerAuth: HttpServiceSetup['registerAuth'];
  registerOnPostAuth: HttpServiceSetup['registerOnPostAuth'];
  registerOnPreResponse: HttpServiceSetup['registerOnPreResponse'];
  getAuthHeaders: GetAuthHeaders;
  auth: {
    get: GetAuthState;
    isAuthenticated: IsAuthenticated;
  };
  getServerInfo: () => HttpServerInfo;
}

/** @internal */
export type LifecycleRegistrar = Pick<
  HttpServerSetup,
  | 'registerOnPreRouting'
  | 'registerOnPreAuth'
  | 'registerAuth'
  | 'registerOnPostAuth'
  | 'registerOnPreResponse'
>;

export class HttpServer {
  private server?: Server;
  private config?: HttpConfig;
  private registeredRouters = new Set<IRouter>();
  private authRegistered = false;
  private cookieSessionStorageCreated = false;
  private stopped = false;

  private readonly log: Logger;
  private readonly authState: AuthStateStorage;
  private readonly authRequestHeaders: AuthHeadersStorage;
  private readonly authResponseHeaders: AuthHeadersStorage;

  constructor(private readonly logger: LoggerFactory, private readonly name: string) {
    this.authState = new AuthStateStorage(() => this.authRegistered);
    this.authRequestHeaders = new AuthHeadersStorage();
    this.authResponseHeaders = new AuthHeadersStorage();
    this.log = logger.get('http', 'server', name);
  }

  public isListening() {
    return this.server !== undefined && this.server.listener.listening;
  }

  private registerRouter(router: IRouter) {
    if (this.isListening()) {
      throw new Error('Routers can be registered only when HTTP server is stopped.');
    }

    this.registeredRouters.add(router);
  }

  public async setup(config: HttpConfig): Promise<HttpServerSetup> {
    const serverOptions = getServerOptions(config);
    const listenerOptions = getListenerOptions(config);
    this.server = createServer(serverOptions, listenerOptions);
    await this.server.register([HapiStaticFiles]);
    this.config = config;

    const basePathService = new BasePath(config.basePath);
    this.setupBasePathRewrite(config, basePathService);
    this.setupConditionalCompression(config);
    this.setupRequestStateAssignment(config);

    return {
      registerRouter: this.registerRouter.bind(this),
      registerStaticDir: this.registerStaticDir.bind(this),
      registerOnPreRouting: this.registerOnPreRouting.bind(this),
      registerOnPreAuth: this.registerOnPreAuth.bind(this),
      registerAuth: this.registerAuth.bind(this),
      registerOnPostAuth: this.registerOnPostAuth.bind(this),
      registerOnPreResponse: this.registerOnPreResponse.bind(this),
      createCookieSessionStorageFactory: <T>(cookieOptions: SessionStorageCookieOptions<T>) =>
        this.createCookieSessionStorageFactory(cookieOptions, config.basePath),
      basePath: basePathService,
      csp: config.csp,
      auth: {
        get: this.authState.get,
        isAuthenticated: this.authState.isAuthenticated,
      },
      getAuthHeaders: this.authRequestHeaders.get,
      getServerInfo: () => ({
        name: config.name,
        hostname: config.host,
        port: config.port,
        protocol: this.server!.info.protocol,
      }),
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
    if (this.stopped) {
      this.log.warn(`start called after stop`);
      return;
    }
    this.log.debug('starting http server');

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        this.log.debug(`registering route handler for [${route.path}]`);
        // Hapi does not allow payload validation to be specified for 'head' or 'get' requests
        const validate = isSafeMethod(route.method) ? undefined : { payload: true };
        const { authRequired, tags, body = {}, timeout } = route.options;
        const { accepts: allow, maxBytes, output, parse } = body;

        const kibanaRouteOptions: KibanaRouteOptions = {
          xsrfRequired: route.options.xsrfRequired ?? !isSafeMethod(route.method),
        };

        // To work around https://github.com/hapijs/hapi/issues/4122 until v20, set the socket
        // timeout on the route to a fake timeout only when the payload timeout is specified.
        // Within the onPreAuth lifecycle of the route itself, we'll override the timeout with the
        // real socket timeout.
        const fakeSocketTimeout = timeout?.payload ? timeout.payload + 1 : undefined;

        this.server.route({
          handler: route.handler,
          method: route.method,
          path: route.path,
          options: {
            auth: this.getAuthOption(authRequired),
            app: kibanaRouteOptions,
            ext: {
              onPreAuth: {
                method: (request, h) => {
                  // At this point, the socket timeout has only been set to work-around the HapiJS bug.
                  // We need to either set the real per-route timeout or use the default idle socket timeout
                  if (timeout?.idleSocket) {
                    request.raw.req.socket.setTimeout(timeout.idleSocket);
                  } else if (fakeSocketTimeout) {
                    // NodeJS uses a socket timeout of `0` to denote "no timeout"
                    request.raw.req.socket.setTimeout(this.config!.socketTimeout ?? 0);
                  }

                  return h.continue;
                },
              },
            },
            tags: tags ? Array.from(tags) : undefined,
            // TODO: This 'validate' section can be removed once the legacy platform is completely removed.
            // We are telling Hapi that NP routes can accept any payload, so that it can bypass the default
            // validation applied in ./http_tools#getServerOptions
            // (All NP routes are already required to specify their own validation in order to access the payload)
            validate,
            payload: [allow, maxBytes, output, parse, timeout?.payload].some(
              (v) => typeof v !== 'undefined'
            )
              ? {
                  allow,
                  maxBytes,
                  output,
                  parse,
                  timeout: timeout?.payload,
                }
              : undefined,
            timeout: {
              socket: fakeSocketTimeout,
            },
          },
        });
      }
    }

    await this.server.start();
    const serverPath =
      this.config && this.config.rewriteBasePath && this.config.basePath !== undefined
        ? this.config.basePath
        : '';

    this.log.info(`http server running at ${this.server.info.uri}${serverPath}`);
  }

  public async stop() {
    this.stopped = true;
    if (this.server === undefined) {
      return;
    }

    this.log.debug('stopping http server');
    await this.server.stop();
  }

  private getAuthOption(
    authRequired: RouteConfigOptions<any>['authRequired'] = true
  ): undefined | false | { mode: 'required' | 'optional' } {
    if (this.authRegistered === false) return undefined;

    if (authRequired === true) {
      return { mode: 'required' };
    }
    if (authRequired === 'optional') {
      return { mode: 'optional' };
    }
    if (authRequired === false) {
      return false;
    }
  }

  private setupBasePathRewrite(config: HttpConfig, basePathService: BasePath) {
    if (config.basePath === undefined || !config.rewriteBasePath) {
      return;
    }

    this.registerOnPreRouting((request, response, toolkit) => {
      const oldUrl = request.url.href!;
      const newURL = basePathService.remove(oldUrl);
      const shouldRedirect = newURL !== oldUrl;
      if (shouldRedirect) {
        return toolkit.rewriteUrl(newURL);
      }
      return response.notFound();
    });
  }

  private setupConditionalCompression(config: HttpConfig) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`setupConditionalCompression called after stop`);
    }

    const { enabled, referrerWhitelist: list } = config.compression;
    if (!enabled) {
      this.log.debug('HTTP compression is disabled');
      this.server.ext('onRequest', (request, h) => {
        request.info.acceptEncoding = '';
        return h.continue;
      });
    } else if (list) {
      this.log.debug(`HTTP compression is only enabled for any referrer in the following: ${list}`);
      this.server.ext('onRequest', (request, h) => {
        const { referrer } = request.info;
        if (referrer !== '') {
          const { hostname } = url.parse(referrer);
          if (!hostname || !list.includes(hostname)) {
            request.info.acceptEncoding = '';
          }
        }
        return h.continue;
      });
    }
  }

  private setupRequestStateAssignment(config: HttpConfig) {
    this.server!.ext('onRequest', (request, responseToolkit) => {
      request.app = {
        ...(request.app ?? {}),
        requestId: getRequestId(request, config.requestId),
      } as KibanaRequestState;
      return responseToolkit.continue;
    });
  }

  private registerOnPreAuth(fn: OnPreAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`registerOnPreAuth called after stop`);
    }

    this.server.ext('onPreAuth', adoptToHapiOnPreAuth(fn, this.log));
  }

  private registerOnPostAuth(fn: OnPostAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`registerOnPostAuth called after stop`);
    }

    this.server.ext('onPostAuth', adoptToHapiOnPostAuthFormat(fn, this.log));
  }

  private registerOnPreRouting(fn: OnPreRoutingHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`registerOnPreRouting called after stop`);
    }

    this.server.ext('onRequest', adoptToHapiOnRequest(fn, this.log));
  }

  private registerOnPreResponse(fn: OnPreResponseHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`registerOnPreResponse called after stop`);
    }

    this.server.ext('onPreResponse', adoptToHapiOnPreResponseFormat(fn, this.log));
  }

  private async createCookieSessionStorageFactory<T>(
    cookieOptions: SessionStorageCookieOptions<T>,
    basePath?: string
  ) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`createCookieSessionStorageFactory called after stop`);
    }
    if (this.cookieSessionStorageCreated) {
      throw new Error('A cookieSessionStorageFactory was already created');
    }
    this.cookieSessionStorageCreated = true;
    const sessionStorageFactory = await createCookieSessionStorageFactory<T>(
      this.logger.get('http', 'server', this.name, 'cookie-session-storage'),
      this.server,
      cookieOptions,
      basePath
    );
    return sessionStorageFactory;
  }

  private registerAuth<T>(fn: AuthenticationHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopped) {
      this.log.warn(`registerAuth called after stop`);
    }
    if (this.authRegistered) {
      throw new Error('Auth interceptor was already registered');
    }
    this.authRegistered = true;

    this.server.auth.scheme('login', () => ({
      authenticate: adoptToHapiAuthFormat(
        fn,
        this.log,
        (req, { state, requestHeaders, responseHeaders }) => {
          this.authState.set(req, state);

          if (responseHeaders) {
            this.authResponseHeaders.set(req, responseHeaders);
          }

          if (requestHeaders) {
            this.authRequestHeaders.set(req, requestHeaders);
            // we mutate headers only for the backward compatibility with the legacy platform.
            // where some plugin read directly from headers to identify whether a user is authenticated.
            Object.assign(req.headers, requestHeaders);
          }
        }
      ),
    }));
    this.server.auth.strategy('session', 'login');

    // The default means that the `session` strategy that is based on `login` schema defined above will be
    // automatically assigned to all routes that don't contain an auth config.
    // should be applied for all routes if they don't specify auth strategy in route declaration
    // https://github.com/hapijs/hapi/blob/master/API.md#-serverauthdefaultoptions
    this.server.auth.default('session');

    this.registerOnPreResponse((request, preResponseInfo, t) => {
      const authResponseHeaders = this.authResponseHeaders.get(request);
      return t.next({ headers: authResponseHeaders });
    });
  }

  private registerStaticDir(path: string, dirPath: string) {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    if (this.stopped) {
      this.log.warn(`registerStaticDir called after stop`);
    }

    this.server.route({
      path,
      method: 'GET',
      handler: {
        directory: {
          path: dirPath,
          listing: false,
          lookupCompressed: true,
        },
      },
      options: { auth: false },
    });
  }
}
