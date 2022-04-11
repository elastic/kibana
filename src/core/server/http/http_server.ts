/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server, Request } from '@hapi/hapi';
import HapiStaticFiles from '@hapi/inert';
import url from 'url';
import uuid from 'uuid';
import {
  createServer,
  getListenerOptions,
  getServerOptions,
  getRequestId,
} from '@kbn/server-http-tools';
import agent from 'elastic-apm-node';

import type { Duration } from 'moment';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import apm from 'elastic-apm-node';
import { Logger, LoggerFactory } from '../logging';
import { HttpConfig } from './http_config';
import type { InternalExecutionContextSetup } from '../execution_context';
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
  RouterRoute,
} from './router';
import {
  SessionStorageCookieOptions,
  createCookieSessionStorageFactory,
} from './cookie_session_storage';
import { AuthStateStorage } from './auth_state_storage';
import { AuthHeadersStorage, IAuthHeadersStorage } from './auth_headers_storage';
import { BasePath } from './base_path_service';
import { getEcsResponseLog } from './logging';
import { HttpServiceSetup, HttpServerInfo, HttpAuth, RegisterStaticDirOptions } from './types';

/** @internal */
export interface HttpServerSetup {
  server: Server;
  /**
   * Add all the routes registered with `router` to HTTP server request listeners.
   * @param router {@link IRouter} - a router with registered route handlers.
   */
  registerRouter: (router: IRouter) => void;
  /**
   * Add all the routes registered with `router` to HTTP server request listeners.
   * Unlike `registerRouter`, this function allows routes to be registered even after the server
   * has started listening for requests.
   * @param router {@link IRouter} - a router with registered route handlers.
   */
  registerRouterAfterListening: (router: IRouter) => void;
  registerStaticDir: (path: string, dirPath: string, options?: RegisterStaticDirOptions) => void;
  basePath: HttpServiceSetup['basePath'];
  csp: HttpServiceSetup['csp'];
  createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
  registerOnPreRouting: HttpServiceSetup['registerOnPreRouting'];
  registerOnPreAuth: HttpServiceSetup['registerOnPreAuth'];
  registerAuth: HttpServiceSetup['registerAuth'];
  registerOnPostAuth: HttpServiceSetup['registerOnPostAuth'];
  registerOnPreResponse: HttpServiceSetup['registerOnPreResponse'];
  authRequestHeaders: IAuthHeadersStorage;
  auth: HttpAuth;
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
  private handleServerResponseEvent?: (req: Request) => void;
  private stopping = false;
  private stopped = false;

  private readonly log: Logger;
  private readonly authState: AuthStateStorage;
  private readonly authRequestHeaders: AuthHeadersStorage;
  private readonly authResponseHeaders: AuthHeadersStorage;

  constructor(
    private readonly logger: LoggerFactory,
    private readonly name: string,
    private readonly shutdownTimeout$: Observable<Duration>
  ) {
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

  private registerRouterAfterListening(router: IRouter) {
    if (this.isListening()) {
      for (const route of router.getRoutes()) {
        this.configureRoute(route);
      }
    } else {
      // Not listening yet, add to set of registeredRouters so that it can be added after listening has started.
      this.registeredRouters.add(router);
    }
  }

  public async setup(
    config: HttpConfig,
    executionContext?: InternalExecutionContextSetup
  ): Promise<HttpServerSetup> {
    const serverOptions = getServerOptions(config);
    const listenerOptions = getListenerOptions(config);
    this.server = createServer(serverOptions, listenerOptions);
    await this.server.register([HapiStaticFiles]);
    this.config = config;

    // It's important to have setupRequestStateAssignment call the very first, otherwise context passing will be broken.
    // That's the only reason why context initialization exists in this method.
    this.setupRequestStateAssignment(config, executionContext);
    const basePathService = new BasePath(config.basePath, config.publicBaseUrl);
    this.setupBasePathRewrite(config, basePathService);
    this.setupConditionalCompression(config);
    this.setupResponseLogging();
    this.setupGracefulShutdownHandlers();

    return {
      registerRouter: this.registerRouter.bind(this),
      registerRouterAfterListening: this.registerRouterAfterListening.bind(this),
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
      authRequestHeaders: this.authRequestHeaders,
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
    if (this.stopping || this.stopped) {
      this.log.warn(`start called after stop`);
      return;
    }
    this.log.debug('starting http server');

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        this.configureRoute(route);
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
    this.stopping = true;
    if (this.server === undefined) {
      this.stopping = false;
      this.stopped = true;
      return;
    }

    const hasStarted = this.server.info.started > 0;
    if (hasStarted) {
      this.log.debug('stopping http server');

      const shutdownTimeout = await this.shutdownTimeout$.pipe(take(1)).toPromise();
      await this.server.stop({ timeout: shutdownTimeout.asMilliseconds() });

      this.log.debug(`http server stopped`);

      // Removing the listener after stopping so we don't leave any pending requests unhandled
      if (this.handleServerResponseEvent) {
        this.server.events.removeListener('response', this.handleServerResponseEvent);
      }
    }
    this.stopping = false;
    this.stopped = true;
  }

  private getAuthOption(
    authRequired: RouteConfigOptions<any>['authRequired'] = true
  ): undefined | false | { mode: 'required' | 'try' } {
    if (this.authRegistered === false) return undefined;

    if (authRequired === true) {
      return { mode: 'required' };
    }
    if (authRequired === 'optional') {
      // we want to use HAPI `try` mode and not `optional` to not throw unauthorized errors when the user
      // has invalid or expired credentials
      return { mode: 'try' };
    }
    if (authRequired === false) {
      return false;
    }
  }

  private setupGracefulShutdownHandlers() {
    this.registerOnPreRouting((request, response, toolkit) => {
      if (this.stopping || this.stopped) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Kibana is shutting down and not accepting new incoming requests' },
        });
      }
      return toolkit.next();
    });
  }

  private setupBasePathRewrite(config: HttpConfig, basePathService: BasePath) {
    if (config.basePath === undefined || !config.rewriteBasePath) {
      return;
    }

    this.registerOnPreRouting((request, response, toolkit) => {
      const oldUrl = request.url.pathname + request.url.search;
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
    if (this.stopping || this.stopped) {
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

  private setupResponseLogging() {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`setupResponseLogging called after stop`);
    }

    const log = this.logger.get('http', 'server', 'response');

    this.handleServerResponseEvent = (request) => {
      const { message, meta } = getEcsResponseLog(request, this.log);
      log.debug(message!, meta);
    };

    this.server.events.on('response', this.handleServerResponseEvent);
  }

  private setupRequestStateAssignment(
    config: HttpConfig,
    executionContext?: InternalExecutionContextSetup
  ) {
    this.server!.ext('onRequest', (request, responseToolkit) => {
      const requestId = getRequestId(request, config.requestId);

      const parentContext = executionContext?.getParentContextFrom(request.headers);

      if (executionContext && parentContext) {
        executionContext.set(parentContext);
        apm.addLabels(executionContext.getAsLabels());
      }

      executionContext?.setRequestId(requestId);

      request.app = {
        ...(request.app ?? {}),
        requestId,
        requestUuid: uuid.v4(),
        // Kibana stores trace.id until https://github.com/elastic/apm-agent-nodejs/issues/2353 is resolved
        // The current implementation of the APM agent ends a request transaction before "response" log is emitted.
        traceId: agent.currentTraceIds['trace.id'],
      } as KibanaRequestState;
      return responseToolkit.continue;
    });
  }

  private registerOnPreAuth(fn: OnPreAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPreAuth called after stop`);
    }

    this.server.ext('onPreAuth', adoptToHapiOnPreAuth(fn, this.log));
  }

  private registerOnPostAuth(fn: OnPostAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPostAuth called after stop`);
    }

    this.server.ext('onPostAuth', adoptToHapiOnPostAuthFormat(fn, this.log));
  }

  private registerOnPreRouting(fn: OnPreRoutingHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPreRouting called after stop`);
    }

    this.server.ext('onRequest', adoptToHapiOnRequest(fn, this.log));
  }

  private registerOnPreResponse(fn: OnPreResponseHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
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
    if (this.stopping || this.stopped) {
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
    if (this.stopping || this.stopped) {
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

  private registerStaticDir(
    path: string,
    dirPath: string,
    { etagMethod = 'hash', cache }: RegisterStaticDirOptions = {}
  ) {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerStaticDir called after stop`);
    }

    const { expiresIn, otherwise, privacy } = cache ?? {
      otherwise: 'must-revalidate',
      privacy: 'public',
    };

    this.server.route({
      path,
      method: 'GET',
      handler: {
        directory: {
          path: dirPath,
          listing: false,
          lookupCompressed: true,
          // @ts-expect-error missing from typedef
          lookupMap: {
            gzip: '.gz',
            br: '.br',
          },
          etagMethod,
        },
      },
      options: {
        auth: false,
        cache: {
          privacy,
          otherwise,
          expiresIn,
        },
      },
    });
  }

  private configureRoute(route: RouterRoute) {
    this.log.debug(`registering route handler for [${route.path}]`);
    // Hapi does not allow payload validation to be specified for 'head' or 'get' requests
    const validate = isSafeMethod(route.method) ? undefined : { payload: true };
    const { authRequired, tags, body = {}, timeout } = route.options;
    const { accepts: allow, maxBytes, output, parse } = body;

    const kibanaRouteOptions: KibanaRouteOptions = {
      xsrfRequired: route.options.xsrfRequired ?? !isSafeMethod(route.method),
    };

    this.server!.route({
      handler: route.handler,
      method: route.method,
      path: route.path,
      options: {
        auth: this.getAuthOption(authRequired),
        app: kibanaRouteOptions,
        tags: tags ? Array.from(tags) : undefined,
        // TODO: This 'validate' section can be removed once the legacy platform is completely removed.
        // We are telling Hapi that NP routes can accept any payload, so that it can bypass the default
        // validation applied in ./http_tools#getServerOptions
        // (All NP routes are already required to specify their own validation in order to access the payload)
        validate,
        // @ts-expect-error Types are outdated and doesn't allow `payload.multipart` to be `true`
        payload: [allow, maxBytes, output, parse, timeout?.payload].some((x) => x !== undefined)
          ? {
              allow,
              maxBytes,
              output,
              parse,
              timeout: timeout?.payload,
              multipart: true,
            }
          : undefined,
        timeout: {
          socket: timeout?.idleSocket ?? this.config!.socketTimeout,
        },
      },
    });
  }
}
