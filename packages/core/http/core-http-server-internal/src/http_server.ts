/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { promisify } from 'util';

import fastifyAuth from '@fastify/auth';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, HTTPMethods, preHandlerAsyncHookHandler } from 'fastify';
import {
  createServer,
  getListenerOptions,
  getServerOptions,
  getCorsOptions,
  getRequestId,
} from '@kbn/server-http-tools';

// import type { Duration } from 'moment';
// import { firstValueFrom, Observable } from 'rxjs';
// import { Observable } from 'rxjs';
// import { take } from 'rxjs/operators';
import apm from 'elastic-apm-node';
import type { Logger, LoggerFactory } from '@kbn/logging';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import { isSafeMethod } from '@kbn/core-http-router-server-internal';
import type {
  IRouter,
  // RouteConfigOptions,
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
} from '@kbn/core-http-server';
import { HttpConfig } from './http_config';
import { adoptToFastifyAuthFormat } from './lifecycle/auth';
import { adoptToFastifyOnPreAuth } from './lifecycle/on_pre_auth';
import { adoptToFastifyOnPostAuthFormat } from './lifecycle/on_post_auth';
import { adoptToFastifyOnRequest } from './lifecycle/on_pre_routing';
import { adoptToFastifyOnPreResponseFormat } from './lifecycle/on_pre_response';
import { createCookieSessionStorageFactory } from './cookie_session_storage';
import { AuthStateStorage } from './auth_state_storage';
import { AuthHeadersStorage } from './auth_headers_storage';
import { BasePath } from './base_path_service';
import { getEcsResponseLog } from './logging';

/** @internal */
export interface HttpServerSetup {
  server: FastifyInstance;
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
  registerStaticDir: (path: string, dirPath: string) => void;
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
  private server?: FastifyInstance;
  private config?: HttpConfig;
  private registeredRouters = new Set<IRouter>();
  private cookieSessionStorageCreated = false;
  private onPreAuthHooks: preHandlerAsyncHookHandler[] = [];
  private onPostAuthHooks: preHandlerAsyncHookHandler[] = [];
  private listening = false;
  private stopping = false;
  private stopped = false;

  private readonly log: Logger;
  private readonly authState: AuthStateStorage;
  private readonly authRequestHeaders: AuthHeadersStorage;
  private readonly authResponseHeaders: AuthHeadersStorage;

  constructor(
    private readonly logger: LoggerFactory,
    private readonly name: string // private readonly shutdownTimeout$: Observable<Duration>
  ) {
    // @ts-expect-error: Property 'hasPlugin' does not exist on type 'FastifyInstance` - The Fastify types are out of date
    this.authState = new AuthStateStorage(() => this.server?.hasPlugin('@fastify/auth') ?? false);
    this.authRequestHeaders = new AuthHeadersStorage();
    this.authResponseHeaders = new AuthHeadersStorage();
    this.log = logger.get('http', 'server', name);
  }

  public isListening() {
    return this.listening === true;
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
    const corsOptions = getCorsOptions(config);
    this.server = createServer(serverOptions, corsOptions);
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
        protocol: 'http', // TODO: Update this to Fastify: this.server!.info.protocol,
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

    const listenerOptions = getListenerOptions(this.config); // TODO: Isn't this.config always set because `setup` is call before `start`?
    await this.server.listen(listenerOptions);
    this.listening = true;
    const serverPath =
      this.config && this.config.rewriteBasePath && this.config.basePath !== undefined
        ? this.config.basePath
        : '';

    // this.log.info(`http server running at ${this.server.info.uri}${serverPath}`); // TODO: Update to Fastify
    this.log.info(`http server running at ${serverPath}`);
  }

  public async stop() {
    this.stopping = true;
    if (this.server === undefined) {
      this.stopping = false;
      this.stopped = true;
      return;
    }

    const hasStarted = this.listening; // TODO: Is this equivalent to hapi: this.server.info.started > 0;
    if (hasStarted) {
      this.log.debug('stopping http server');

      // const shutdownTimeout = await firstValueFrom(this.shutdownTimeout$.pipe(take(1)));
      // await this.server.stop({ timeout: shutdownTimeout.asMilliseconds() });
      await this.server.close(); // TODO: Fastify currently doesn't support a close timeout. For details see: https://github.com/fastify/fastify/issues/3617

      this.log.debug(`http server stopped`);
    }
    this.stopping = false;
    this.stopped = true;
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
      this.server.addHook('onRequest', async (request, reply) => {
        // TODO: Port to Fastify:
        // request.info.acceptEncoding = '';
      });
    } else if (list) {
      this.log.debug(`HTTP compression is only enabled for any referrer in the following: ${list}`);
      this.server.addHook('onRequest', async (request, reply) => {
        // TODO: Port to Fastify:
        // const { referrer } = request.info;
        // if (referrer !== '') {
        //   const { hostname } = url.parse(referrer);
        //   if (!hostname || !list.includes(hostname)) {
        //     request.info.acceptEncoding = '';
        //   }
        // }
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

    this.server.addHook('onResponse', async (request, reply) => {
      const { message, meta } = getEcsResponseLog(request, reply, this.log);
      log.debug(message, meta);
    });
  }

  private setupRequestStateAssignment(
    config: HttpConfig,
    executionContext?: InternalExecutionContextSetup
  ) {
    this.server!.addHook('onRequest', (request, reply) => {
      const requestId = getRequestId(request, config.requestId);

      const parentContext = executionContext?.getParentContextFrom(request.headers);

      if (executionContext && parentContext) {
        executionContext.set(parentContext);
        apm.addLabels(executionContext.getAsLabels());
      }

      executionContext?.setRequestId(requestId);

      // TODO: I removed the following properties that should be covered elsewhere:
      // - `requestUuid`: Moved to `request.id`
      // - `traceId`: Should be handeld internally by elastic-apm-node when using Fastify
      (request.context.config as KibanaRequestState).requestId = requestId;
    });
  }

  private registerOnPreAuth(fn: OnPreAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPreAuth called after stop`);
    }

    this.onPreAuthHooks.push(adoptToFastifyOnPreAuth(fn, this.log));
  }

  private registerOnPostAuth(fn: OnPostAuthHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPostAuth called after stop`);
    }

    this.onPostAuthHooks.push(adoptToFastifyOnPostAuthFormat(fn, this.log));
  }

  private registerOnPreRouting(fn: OnPreRoutingHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPreRouting called after stop`);
    }

    this.server.addHook('onRequest', adoptToFastifyOnRequest(fn, this.log));
  }

  private registerOnPreResponse(fn: OnPreResponseHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerOnPreResponse called after stop`);
    }

    this.server.addHook('onSend', adoptToFastifyOnPreResponseFormat(fn, this.log)); // TODO: Verify that Fastify `onSend` is equivilent to Hapi `onPreResponse`
  }

  private createCookieSessionStorageFactory<T>(
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
    return createCookieSessionStorageFactory<T>(
      this.logger.get('http', 'server', this.name, 'cookie-session-storage'),
      this.server,
      cookieOptions,
      basePath
    );
  }

  private registerAuth<T>(fn: AuthenticationHandler) {
    if (this.server === undefined) {
      throw new Error('Server is not created yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerAuth called after stop`);
    }
    // @ts-expect-error: Property 'hasPlugin' does not exist on type 'FastifyInstance` - The Fastify types are out of date
    if (this.server.hasPlugin('@fastify/auth')) {
      throw new Error('Auth interceptor was already registered');
    }

    this.server.register(fastifyAuth);

    this.server.decorate(
      'verifyLogin',
      adoptToFastifyAuthFormat(
        fn, // This function performs the actual authenticqtion
        this.log,
        (req, { state, requestHeaders, responseHeaders }) => {
          // We have successfully been activated if this function is called
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
      )
    );

    const onAuth = promisify(
      this.server.auth([
        // @ts-expect-error: Property 'verifyLogin' does not exist on type 'FastifyInstance' - Figure out a way to tell it that this is ok
        this.server.verifyLogin,
      ])
    ) as preHandlerAsyncHookHandler;
    const httpServer = this;
    this.server.addHook('preHandler', async function (request, reply) {
      for (const hook of httpServer.onPreAuthHooks) {
        await hook.call(this, request, reply);
      }

      await onAuth.call(this, request, reply);

      for (const hook of httpServer.onPostAuthHooks) {
        await hook.call(this, request, reply);
      }
    });

    this.registerOnPreResponse((request, preResponseInfo, t) => {
      const authResponseHeaders = this.authResponseHeaders.get(request);
      return t.next({ headers: authResponseHeaders });
    });
  }

  private registerStaticDir(prefix: string, root: string) {
    if (this.server === undefined) {
      throw new Error('Http server is not setup up yet');
    }
    if (this.stopping || this.stopped) {
      this.log.warn(`registerStaticDir called after stop`);
    }

    this.server.register(fastifyStatic, {
      root,
      prefix,
      // TODO: Convert the following options to Fastify equivilent
      // lookupCompressed: true,
      // cache: {
      //   privacy: 'public',
      //   otherwise: 'must-revalidate',
      // },
    });
  }

  private configureRoute(route: RouterRoute) {
    this.log.debug(`registering route handler for [${route.path}]`);
    // Hapi does not allow payload validation to be specified for 'head' or 'get' requests
    // const validate = isSafeMethod(route.method) ? undefined : { payload: true };
    // const { authRequired, tags, body = {}, timeout } = route.options;
    const { authRequired, tags } = route.options;
    // const { accepts: allow, maxBytes, output, parse } = body;

    const kibanaRouteOptions: KibanaRouteOptions = {
      xsrfRequired: route.options.xsrfRequired ?? !isSafeMethod(route.method), // TODO: Maybe this call to `isSafeMethod` is no longer needed with Fastify?
      authRequired,
      tags: tags ? Array.from(tags) : undefined,
    };

    this.server!.route({
      handler: route.handler,
      method: route.method.toUpperCase() as HTTPMethods,
      url: route.path,
      config: kibanaRouteOptions,
      // options: {
      // TODO: This 'validate' section can be removed once the legacy platform is completely removed.
      // We are telling Hapi that NP routes can accept any payload, so that it can bypass the default
      // validation applied in ./http_tools#getServerOptions
      // (All NP routes are already required to specify their own validation in order to access the payload)
      //   validate, // TODO: Convert `validate` to Fastify
      // @ ts-expect-error Types are outdated and doesn't allow `payload.multipart` to be `true`
      //   payload: [allow, maxBytes, output, parse, timeout?.payload].some((x) => x !== undefined) // TODO: Convert `payload` to Fastify
      //     ? {
      //         allow,
      //         maxBytes,
      //         output,
      //         parse,
      //         timeout: timeout?.payload,
      //         multipart: true,
      //       }
      //     : undefined,
      //   timeout: { // TODO: Convert `timeout` to Fastify
      //    socket: timeout?.idleSocket ?? this.config!.socketTimeout,
      //   },
      // },
    });
  }
}
