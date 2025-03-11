/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Server, Request } from '@hapi/hapi';
import HapiStaticFiles from '@hapi/inert';
import url from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createServer, getServerOptions, setTlsConfig, getRequestId } from '@kbn/server-http-tools';
import type { Duration } from 'moment';
import { Observable, Subscription, firstValueFrom, pairwise, take } from 'rxjs';
import apm from 'elastic-apm-node';
import Brok from 'brok';
import type { Logger, LoggerFactory } from '@kbn/logging';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import { CoreVersionedRouter, isSafeMethod, Router } from '@kbn/core-http-router-server-internal';
import type {
  IRouter,
  RouteConfigOptions,
  KibanaRouteOptions,
  KibanaRequestState,
  RouterRoute,
  AuthenticationHandler,
  OnPreAuthHandler,
  OnPostAuthHandler,
  OnPreRoutingHandler,
  OnPreResponseHandler,
  SessionStorageCookieOptions,
  HttpServiceSetup,
  HttpServerInfo,
  HttpAuth,
  IAuthHeadersStorage,
  RouterDeprecatedApiDetails,
  RouteMethod,
  VersionedRouterRoute,
} from '@kbn/core-http-server';
import { performance } from 'perf_hooks';
import { isBoom } from '@hapi/boom';
import { identity, isNil, isObject, omitBy } from 'lodash';
import { IHttpEluMonitorConfig } from '@kbn/core-http-server/src/elu_monitor';
import { Env } from '@kbn/config';
import { CoreContext } from '@kbn/core-base-server-internal';
import { HttpConfig } from './http_config';
import { adoptToHapiAuthFormat } from './lifecycle/auth';
import { adoptToHapiOnPreAuth } from './lifecycle/on_pre_auth';
import { adoptToHapiOnPostAuthFormat } from './lifecycle/on_post_auth';
import { adoptToHapiOnRequest } from './lifecycle/on_pre_routing';
import { adoptToHapiOnPreResponseFormat } from './lifecycle/on_pre_response';
import { createCookieSessionStorageFactory } from './cookie_session_storage';
import { AuthStateStorage } from './auth_state_storage';
import { AuthHeadersStorage } from './auth_headers_storage';
import { BasePath } from './base_path_service';
import { getEcsResponseLog } from './logging';
import { StaticAssets, type InternalStaticAssets } from './static_assets';

/**
 * Adds ELU timings for the executed function to the current's context transaction
 *
 * @param path The request path
 * @param log  Logger
 */
function startEluMeasurement<T>(
  path: string,
  log: Logger,
  eluMonitorOptions: IHttpEluMonitorConfig | undefined
): () => void {
  if (!eluMonitorOptions?.enabled) {
    return identity;
  }

  const startUtilization = performance.eventLoopUtilization();
  const start = performance.now();

  return function stopEluMeasurement() {
    const { active, utilization } = performance.eventLoopUtilization(startUtilization);

    apm.currentTransaction?.addLabels(
      {
        event_loop_utilization: utilization,
        event_loop_active: active,
      },
      false
    );

    const duration = performance.now() - start;

    const { elu: eluThreshold, ela: elaThreshold } = eluMonitorOptions.logging.threshold;

    if (
      eluMonitorOptions.logging.enabled &&
      active >= eluMonitorOptions.logging.threshold.ela &&
      utilization >= eluMonitorOptions.logging.threshold.elu &&
      // static js and js.map assets are generating lots of noise for this
      // event loop check, hiding endpoint slowness which are higher priority
      // remove this check once endpoints slowness is addressed
      !['js', 'js.map'].some((ext) => path.endsWith(ext))
    ) {
      log.warn(
        `Event loop utilization for ${path} exceeded threshold of ${elaThreshold}ms (${Math.round(
          active
        )}ms out of ${Math.round(duration)}ms) and ${eluThreshold * 100}% (${Math.round(
          utilization * 100
        )}%) `,
        {
          labels: {
            request_path: path,
            event_loop_active: active,
            event_loop_utilization: utilization,
          },
        }
      );
    }
  };
}

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
  /**
   * Register a static directory to be served by the Kibana server
   * @note Static assets may be served over CDN
   */
  registerStaticDir: (path: string, dirPath: string) => void;
  staticAssets: InternalStaticAssets;
  basePath: HttpServiceSetup['basePath'];
  csp: HttpServiceSetup['csp'];
  prototypeHardening: boolean;
  createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
  registerOnPreRouting: HttpServiceSetup['registerOnPreRouting'];
  registerOnPreAuth: HttpServiceSetup['registerOnPreAuth'];
  registerAuth: HttpServiceSetup['registerAuth'];
  registerOnPostAuth: HttpServiceSetup['registerOnPostAuth'];
  registerOnPreResponse: HttpServiceSetup['registerOnPreResponse'];
  getDeprecatedRoutes: HttpServiceSetup['getDeprecatedRoutes'];
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

export interface HttpServerSetupOptions {
  config$: Observable<HttpConfig>;
  executionContext?: InternalExecutionContextSetup;
}

/** @internal */
export interface GetRoutersOptions {
  pluginId?: string;
}

export class HttpServer {
  private server?: Server;
  private config?: HttpConfig;
  private subscriptions: Subscription[] = [];
  private registeredRouters = new Set<IRouter>();
  private authRegistered = false;
  private cookieSessionStorageCreated = false;
  private handleServerResponseEvent?: (req: Request) => void;
  private stopping = false;
  private stopped = false;

  private readonly log: Logger;
  private readonly logger: LoggerFactory;
  private readonly authState: AuthStateStorage;
  private readonly authRequestHeaders: AuthHeadersStorage;
  private readonly authResponseHeaders: AuthHeadersStorage;
  private readonly env: Env;

  constructor(
    private readonly coreContext: CoreContext,
    private readonly name: string,
    private readonly shutdownTimeout$: Observable<Duration>
  ) {
    const { logger, env } = this.coreContext;
    this.logger = logger;
    this.env = env;
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

  public async setup({
    config$,
    executionContext,
  }: HttpServerSetupOptions): Promise<HttpServerSetup> {
    const config = await firstValueFrom(config$);
    this.config = config;

    const serverOptions = getServerOptions(config);

    this.server = createServer(serverOptions);
    await this.server.register([HapiStaticFiles]);
    if (config.compression.brotli.enabled) {
      await this.server.register({
        plugin: Brok,
        options: {
          compress: { quality: config.compression.brotli.quality },
        },
      });
    }

    // only hot-reloading TLS config - don't need to subscribe if TLS is initially disabled,
    // given we can't hot-switch from/to enabled/disabled.
    if (config.ssl.enabled) {
      const configSubscription = config$
        .pipe(pairwise())
        .subscribe(([{ ssl: prevSslConfig }, { ssl: newSslConfig }]) => {
          if (prevSslConfig.enabled !== newSslConfig.enabled) {
            this.log.warn(
              'Incompatible TLS config change detected - TLS cannot be toggled without a full server reboot.'
            );
            return;
          }

          const sameConfig = newSslConfig.isEqualTo(prevSslConfig);

          if (!sameConfig) {
            this.log.info('TLS configuration change detected - reloading TLS configuration.');
            setTlsConfig(this.server!, newSslConfig);
          }
        });
      this.subscriptions.push(configSubscription);
    }

    // It's important to have setupRequestStateAssignment call the very first, otherwise context passing will be broken.
    // That's the only reason why context initialization exists in this method.
    this.setupRequestStateAssignment(config, executionContext);
    const basePathService = new BasePath(config.basePath, config.publicBaseUrl);
    this.setupBasePathRewrite(config, basePathService);
    this.setupConditionalCompression(config);
    this.setupResponseLogging();
    this.setupGracefulShutdownHandlers();

    const staticAssets = new StaticAssets({
      basePath: basePathService,
      cdnConfig: config.cdn,
      shaDigest: this.env.packageInfo.buildShaShort,
    });

    return {
      registerRouter: this.registerRouter.bind(this),
      getDeprecatedRoutes: this.getDeprecatedRoutes.bind(this),
      registerRouterAfterListening: this.registerRouterAfterListening.bind(this),
      registerStaticDir: this.registerStaticDir.bind(this),
      staticAssets,
      registerOnPreRouting: this.registerOnPreRouting.bind(this),
      registerOnPreAuth: this.registerOnPreAuth.bind(this),
      registerAuth: this.registerAuth.bind(this),
      registerOnPostAuth: this.registerOnPostAuth.bind(this),
      registerOnPreResponse: this.registerOnPreResponse.bind(this),
      createCookieSessionStorageFactory: <T extends object>(
        cookieOptions: SessionStorageCookieOptions<T>
      ) =>
        this.createCookieSessionStorageFactory(
          cookieOptions,
          config.csp.disableEmbedding,
          config.basePath
        ),
      basePath: basePathService,
      csp: config.csp,
      prototypeHardening: config.prototypeHardening,
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

      const shutdownTimeout = await firstValueFrom(this.shutdownTimeout$.pipe(take(1)));
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

  private getDeprecatedRoutes(): RouterDeprecatedApiDetails[] {
    const deprecatedRoutes: RouterDeprecatedApiDetails[] = [];

    for (const router of this.registeredRouters) {
      const allRouterRoutes = [
        // exclude so we dont get double entries.
        // we need to call the versioned getRoutes to grab the full version options details
        router.getRoutes({ excludeVersionedRoutes: true }),
        router.versioned.getRoutes(),
      ].flat();

      deprecatedRoutes.push(
        ...allRouterRoutes
          .flat()
          .map((route) => {
            const access = route.options.access;
            if (route.isVersioned === true) {
              return [...(route as VersionedRouterRoute).handlers.entries()].map(
                ([_, { options }]) => {
                  const deprecated = options.options?.deprecated;
                  return { route, version: `${options.version}`, deprecated, access };
                }
              );
            }

            return { route, version: undefined, deprecated: route.options.deprecated, access };
          })
          .flat()
          .filter(({ deprecated, access }) => {
            const isRouteDeprecation = isObject(deprecated);
            const isAccessDeprecation = access === 'internal';
            return isRouteDeprecation || isAccessDeprecation;
          })
          .flatMap(({ route, deprecated, version, access }) => {
            return {
              routeDeprecationOptions: deprecated!,
              routeMethod: route.method as RouteMethod,
              routePath: route.path,
              routeVersion: version,
              routeAccess: access,
            };
          })
      );
    }

    return deprecatedRoutes;
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
      if (log.isLevelEnabled('debug')) {
        const { message, meta } = getEcsResponseLog(request, this.log);
        log.debug(message!, meta);
      }
    };

    this.server.events.on('response', this.handleServerResponseEvent);
  }

  private setupRequestStateAssignment(
    config: HttpConfig,
    executionContext?: InternalExecutionContextSetup
  ) {
    this.server!.ext('onPreResponse', (request, responseToolkit) => {
      const stop = (request.app as KibanaRequestState).measureElu;

      if (!stop) {
        return responseToolkit.continue;
      }

      if (isBoom(request.response)) {
        stop();
      } else {
        request.response.events.once('finish', () => {
          stop();
        });
      }

      return responseToolkit.continue;
    });

    this.server!.ext('onRequest', (request, responseToolkit) => {
      const stop = startEluMeasurement(request.path, this.log, this.config?.eluMonitor);

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
        requestUuid: uuidv4(),
        measureElu: stop,
        // Kibana stores trace.id until https://github.com/elastic/apm-agent-nodejs/issues/2353 is resolved
        // The current implementation of the APM agent ends a request transaction before "response" log is emitted.
        traceId: apm.currentTraceIds['trace.id'],
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

  private async createCookieSessionStorageFactory<T extends object>(
    cookieOptions: SessionStorageCookieOptions<T>,
    disableEmbedding: boolean,
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
      disableEmbedding,
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

  public getRouters({ pluginId }: GetRoutersOptions = {}): {
    routers: Router[];
    versionedRouters: CoreVersionedRouter[];
  } {
    const routers: {
      routers: Router[];
      versionedRouters: CoreVersionedRouter[];
    } = {
      routers: [],
      versionedRouters: [],
    };
    const pluginIdFilter = pluginId ? Symbol(pluginId).toString() : undefined;

    for (const router of this.registeredRouters) {
      const matchesIdFilter =
        !pluginIdFilter || (router as Router).pluginId?.toString() === pluginIdFilter;

      if (
        matchesIdFilter &&
        (router as Router).getRoutes({ excludeVersionedRoutes: true }).length > 0
      ) {
        routers.routers.push(router as Router);
      }

      const versionedRouter = router.versioned as CoreVersionedRouter;
      if (matchesIdFilter && versionedRouter.getRoutes().length > 0) {
        routers.versionedRouters.push(versionedRouter);
      }
    }
    return routers;
  }

  private registerStaticDir(path: string, dirPath: string) {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    if (this.stopping || this.stopped) {
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
      options: {
        app: { access: 'public' },
        auth: false,
        cache: {
          privacy: 'public',
          otherwise: 'must-revalidate',
        },
      },
    });
  }

  private getSecurity(route: RouterRoute) {
    const securityConfig = route?.security;

    // for versioned routes, we need to check if the security config is a function
    return typeof securityConfig === 'function' ? securityConfig() : securityConfig;
  }

  private configureRoute(route: RouterRoute) {
    const optionsLogger = this.log.get('options');
    this.log.debug(`registering route handler for [${route.path}]`);
    // Hapi does not allow payload validation to be specified for 'head' or 'get' requests
    const validate = isSafeMethod(route.method) ? undefined : { payload: true };
    const { tags, body = {}, timeout, deprecated } = route.options;
    const { accepts: allow, override, maxBytes, output, parse } = body;

    const authRequired = this.getSecurity(route)?.authc?.enabled ?? route.options.authRequired;

    const kibanaRouteOptions: KibanaRouteOptions = {
      xsrfRequired: route.options.xsrfRequired ?? !isSafeMethod(route.method),
      access: route.options.access ?? 'internal',
      deprecated,
      security: route.security,
      ...omitBy({ excludeFromRateLimiter: route.options.excludeFromRateLimiter }, isNil),
    };
    // Log HTTP API target consumer.
    optionsLogger.debug(
      `access [${kibanaRouteOptions.access}] [${route.method.toUpperCase()}] for path [${
        route.path
      }]`
    );

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
        payload: [allow, override, maxBytes, output, parse, timeout?.payload].some(
          (x) => x !== undefined
        )
          ? {
              allow,
              override,
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
