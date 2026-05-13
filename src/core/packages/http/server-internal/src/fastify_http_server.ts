/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import { firstValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import Fastify from 'fastify';
import FindMyWay from 'find-my-way';
import type { HTTPVersion as FmwHTTPVersion, Instance as FmwInstance } from 'find-my-way';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as nodePath from 'path';
import { createBrotliCompress, createGzip, constants as zlibConstants } from 'zlib';
import mime from 'mime-types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { context, trace, type Span as OTelSpan } from '@opentelemetry/api';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import apm from 'elastic-apm-node';
import type { Request } from '@hapi/hapi';
import { getServerListener, getRequestId } from '@kbn/server-http-tools';
import { addSpanLabels } from '@kbn/apm-utils';
import { isNil, omitBy } from 'lodash';
import type { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { InternalUserActivityServiceSetup } from '@kbn/core-user-activity-server-internal';
import type {
  CoreVersionedRouter,
  InternalRouteHandler,
  Router,
} from '@kbn/core-http-router-server-internal';
import { getInternalRouteHandler } from '@kbn/core-http-router-server-internal';
import type {
  IRouter,
  AuthenticationHandler,
  KibanaRequest,
  KibanaRequestState,
  KibanaRouteOptions,
  RouterDeprecatedApiDetails,
  RouterRoute,
  HttpServerInfo,
} from '@kbn/core-http-server';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';

import type { GetRoutersOptions, HttpServerSetup, HttpServerSetupOptions } from './http_server';
import { startEluMeasurement } from './http_server';
import type { HttpConfig } from './http_config';
import { BasePath } from './base_path_service';
import { AuthStateStorage } from './auth_state_storage';
import { AuthHeadersStorage } from './auth_headers_storage';
import { StaticAssets } from './static_assets';
import { FastifyResponseAdapter } from './fastify/fastify_response_adapter';
import {
  buildHapiCompatRequestFromFastify,
  toPlainRouteParams,
} from './fastify/fastify_to_hapi_request';
import {
  adoptToFastifyOnPostAuth,
  adoptToFastifyOnPreAuth,
  adoptToFastifyOnPreResponse,
  adoptToFastifyOnPreRouting,
} from './fastify/fastify_lifecycle';
import { extractHapiWildcardName, translateHapiPathToFastify } from './fastify/translate_path';
import { HapiCompatServer } from './fastify/hapi_compat_server';
import { createFastifyCookieSessionStorageFactory } from './fastify/fastify_cookie_session_storage';
import { KIBANA_HAPI_COMPAT_REQUEST, registerFastifyAuthentication } from './fastify/fastify_auth';
import { installHapiCompatibleJsonBodyParser } from './fastify/install_hapi_compatible_json_body_parser';
import { installFastifyGlobalErrorHandler } from './fastify/fastify_global_error_handler';
import { registerFastifyMultipartAndKibanaBodyHook } from './fastify/fastify_multipart_kibana_body';
import { registerFastifyFallbackStreamBodyParser } from './fastify/register_fastify_fallback_stream_body_parser';
import {
  orderPrecompressedEncodings,
  resolvePrecompressedStaticPath,
} from './fastify/precompressed_static_file';
import { applyHapiCompatRequestTimeouts } from './fastify/apply_hapi_compat_request_timeouts';
import { attachFastifyPayloadReceiveTimeout } from './fastify/register_fastify_payload_timeout_pre_parsing';

/** Upper bound for Fastify's raw body limit — must cover saved_objects `_import` (see `savedObjects.maxImportPayloadBytes`). */
const FASTIFY_BODY_LIMIT_CEILING_BYTES = 36 * 1024 * 1024;

const isSafeMethod = (method: string) => method === 'get' || method === 'options';

/** Same semantics as {@link HttpServer.registerStaticDir} `options.app` (public + no auth). */
const STATIC_DIRECTORY_ROUTE_OPTIONS: KibanaRouteOptions = {
  xsrfRequired: false,
  access: 'public',
  security: {
    authc: {
      enabled: false,
      reason: 'Route serves static assets',
    },
    authz: {
      enabled: false,
      reason: 'Route serves static assets',
    },
  },
  excludeFromRateLimiter: true,
};

type FastifyRouteHandler = (req: FastifyRequest, reply: FastifyReply) => unknown | Promise<unknown>;
type FmwHandler = (
  req: FastifyRequest,
  reply: FastifyReply,
  params: Record<string, string | undefined>
) => unknown | Promise<unknown>;

const ALL_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

/**
 * Path passed to find-my-way `find()`. Must be identical in {@link installFastifyDispatcher}
 * and {@link installRouteLookupHook}: if the hook misses a match, `matchedKibanaRouteOptions`
 * is unset and post-auth treats the route as `access: internal` → 400 from
 * `restrictInternalApis` even when the dispatcher matches and serves the asset.
 */
function getFindMyWayLookupPath(req: FastifyRequest): string {
  const raw = req.raw.url ?? req.url;
  if (typeof raw !== 'string' || raw === '') {
    return '/';
  }
  const pathOnly = raw.split(/[?#]/, 1)[0];
  if (pathOnly === '') {
    return '/';
  }
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
}

function pathnameMatchesFastifyWildcardPattern(pathname: string, pattern: string): boolean {
  if (!pattern.endsWith('*')) {
    return pathname === pattern;
  }
  const prefix = pattern.slice(0, -1);
  if (pathname.startsWith(prefix)) {
    return true;
  }
  const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  return pathname === base;
}

/**
 * find-my-way only matches `…/*` when there is a `/` before the splat (`/app/home/` → params),
 * not bare prefixes (`/app/home` → no match). Hapi `{tail*}` matches zero segments without an
 * extra slash. Registering the path with `/*` removed restores parity for URLs like `/app/home`.
 */
function barePrefixPathFromFindMyWayWildcard(url: string): string | undefined {
  if (!url.endsWith('/*')) {
    return undefined;
  }
  const prefix = url.slice(0, -2);
  if (prefix.length === 0 || prefix === '/') {
    return undefined;
  }
  return prefix;
}

/**
 * Resolves the relative path under a static root from find-my-way params. Supports splat
 * routes (`{path*}` → `params['*']`) and named single segments (`{file}` → `params.file`).
 *
 * @internal
 */
function staticRelativePathFromParams(
  routePath: string,
  params: Record<string, string | undefined>
): string {
  const wildcardName = extractHapiWildcardName(routePath);
  if (wildcardName !== undefined) {
    const raw = params['*'] ?? params[wildcardName];
    return String(raw ?? '').replace(/^\/+/, '');
  }

  const braceMatches = routePath.match(/\{([a-zA-Z0-9_]+)\}/g) ?? [];
  const parts: string[] = [];
  for (const brace of braceMatches) {
    const inner = brace.slice(1, -1);
    if (inner.endsWith('*')) {
      continue;
    }
    const value = params[inner];
    if (typeof value === 'string' && value.length > 0) {
      parts.push(value);
    }
  }
  return parts.join('/');
}

/**
 * Fastify-backed HTTP server implementing the same HTTP setup contract as {@link HttpServer}
 * (listen/stop, routers, static dirs, cookie session factory, lifecycle hooks, auth).
 *
 * Uses the same listener factory as Hapi so TLS/HTTP2 settings flow from `HttpConfig`.
 * Routes invoke the internal {@link Router} handler and adapt {@link KibanaResponse} via
 * {@link FastifyResponseAdapter}. Some niche Hapi route options may still differ — rely on
 * integration coverage when changing routing.
 *
 * @internal
 */
export class FastifyHttpServer {
  private readonly log: Logger;
  private readonly authState: AuthStateStorage;
  private readonly authRequestHeaders: AuthHeadersStorage;
  private readonly authResponseHeaders: AuthHeadersStorage;
  private readonly responseAdapter = new FastifyResponseAdapter();

  private fastify?: FastifyInstance;
  private fmw?: FmwInstance<FmwHTTPVersion.V1>;
  private fallbackHandler?: FmwHandler;
  private config?: HttpConfig;
  private listening = false;
  private stopped = false;
  private redactedSessionIdGetter?: (request: KibanaRequest) => Promise<string | undefined>;
  private readonly registeredRouters = new Set<IRouter>();
  private authRegistered = false;

  /** Patterns from {@link registerStaticDir} — used when find-my-way store has no router metadata. */
  private readonly staticDirectoryRouteInfo = new Map<string, string | undefined>();

  /**
   * Bare-prefix routes (`/foo/:id` alongside `/foo/:id/*`) are flushed after all primary
   * routes are registered so shorter paths like `/api/fleet/epm/packages/:pkg/:ver` can be
   * claimed by package-metadata routes before wildcard file routes add their bare prefix.
   */
  private pendingBarePrefixRegistrations: Array<{
    method: string;
    wildcardUrl: string;
    handler: unknown;
    store?: Record<string, unknown>;
  }> = [];

  constructor(
    private readonly coreContext: CoreContext,
    name: string,
    _shutdownTimeout$: Observable<Duration>
  ) {
    this.log = coreContext.logger.get('http', 'server', name, 'fastify');
    this.authState = new AuthStateStorage(() => this.authRegistered);
    this.authRequestHeaders = new AuthHeadersStorage();
    this.authResponseHeaders = new AuthHeadersStorage();
  }

  public isListening(): boolean {
    return this.listening;
  }

  /** @internal */
  public setRedactedSessionIdGetter(
    getter: (request: KibanaRequest) => Promise<string | undefined>
  ) {
    this.redactedSessionIdGetter = getter;
  }

  public async setup({
    config$,
    executionContext,
    userActivity,
  }: HttpServerSetupOptions): Promise<HttpServerSetup> {
    const config = await firstValueFrom(config$);
    this.config = config;

    this.log.warn(
      `[experimental] Starting Kibana with the Fastify HTTP backend. Intended as a drop-in for the Hapi server contract; report behavioral differences during review.`
    );

    // Reuse the Kibana TLS/HTTP2 listener factory so `server.protocol`, TLS, etc. keep
    // working. Fastify accepts an arbitrary listener via `serverFactory`.
    const listener = getServerListener(config);
    this.fastify = Fastify({
      logger: false,
      bodyLimit: Math.max(config.maxPayload.getValueInBytes(), FASTIFY_BODY_LIMIT_CEILING_BYTES),
      serverFactory: ((handler: (req: any, res: any) => void) => {
        listener.on('request', handler);
        return listener;
      }) as any,
      // Trust the proxy info that Kibana already validates upstream; matches Hapi default.
      trustProxy: false,
      // When Fastify is supplied a pre-built server via `serverFactory`, the default
      // `forceCloseConnections: 'idle'` heuristic does not always wire up; declare it
      // explicitly so `fastify.close()` proactively destroys idle keep-alive sockets
      // instead of waiting for `keepAliveTimeout` (default 120s in Kibana). Without
      // this, streamed responses leave the test/client socket lingering and
      // `server.stop()` blocks until the timeout elapses.
      forceCloseConnections: true,
    }) as unknown as FastifyInstance;

    installFastifyGlobalErrorHandler(this.fastify, this.log);
    this.installKibanaRequestStateOnRequest(config, executionContext, userActivity);

    // Mirror @hapi/hapi: reject malformed `Cookie` headers before auth redirects (GET `/` would
    // otherwise respond with 302). Bare cookie segments without `=` must yield 400 + message.
    this.fastify.addHook('onRequest', (req, reply, done) => {
      const raw = req.headers.cookie;
      if (typeof raw !== 'string' || raw.length === 0) {
        done();
        return;
      }
      for (const part of raw.split(';')) {
        const trimmed = part.trim();
        if (trimmed.length === 0) {
          continue;
        }
        if (!trimmed.includes('=')) {
          reply.code(400).type('text/plain; charset=utf-8').send('Invalid cookie header');
          return;
        }
      }
      done();
    });

    await this.installFastifyRequestBodyAdapters(this.fastify, config);

    (this.fastify as any).getKibanaAuthRegistered = () => this.authRegistered;

    // Fastify forbids registering routes after `listen()`, but Kibana relies on adding
    // routes after the preboot/HTTP server is already listening (e.g. plugin services
    // calling `prebootSetup.registerRouterAfterListening(...)` from
    // `i18n_service.preboot`). To keep that contract, route every request through our
    // own `find-my-way` table that lives behind a single Fastify catch-all dispatcher
    // - this lets us mutate the routing table at any point in the lifecycle.
    this.fmw = FindMyWay({
      ignoreTrailingSlash: false,
      caseSensitive: true,
      // Match Hapi: long dynamic segments (e.g. index pattern ids in APIs) must still hit route
      // validation instead of failing route lookup (find-my-way defaults to 100 otherwise).
      maxParamLength: 8192,
      defaultRoute: (_req: any, _res: any) => {
        // No-op here: dispatch happens via `find()`, not `lookup()`.
      },
    });
    this.installFastifyDispatcher(this.fastify, this.fmw);
    this.installRouteLookupHook(this.fastify, this.fmw, config.socketTimeout);

    const basePathService = new BasePath(config.basePath, config.publicBaseUrl);
    const staticAssets = new StaticAssets({
      basePath: basePathService,
      cdnConfig: config.cdn,
      // Match {@link HttpServer}: empty digest collapses to pathname `/`, which makes
      // {@link getBundlesHref} emit `//bundles` (protocol-relative → wrong host "bundles").
      shaDigest: this.coreContext.env.packageInfo.buildShaShort,
    });

    // The `server` field on `HttpServerSetup` historically exposes a Hapi `Server`. The
    // small number of "raw" `server.route(...)` call sites in `HttpService` (preboot 503
    // catch-all, OAS API) use `method: '*'` and a Hapi response toolkit. Translate that
    // subset back into entries in our find-my-way table so those call sites keep working
    // unchanged when the Fastify backend is selected.
    //
    // `method: '*'` catch-alls are stored as a single fallback handler (consulted when
    // no specific route matches). This mirrors Hapi's behavior of letting more specific
    // routes win over a wildcard, while find-my-way otherwise rejects two routes with
    // the same `method + url` pair.
    const hapiCompat = new HapiCompatServer(this.fmw, {
      registerFallback: (handler) => {
        this.fallbackHandler = handler;
      },
    });
    const serverFacade = this.createHapiShapedServerFacade(this.fastify, hapiCompat, listener);

    return {
      server: serverFacade as any,
      registerRouter: this.registerRouter.bind(this),
      registerRouterAfterListening: this.registerRouterAfterListening.bind(this),
      registerStaticDir: this.registerStaticDir.bind(this),
      staticAssets,
      basePath: basePathService,
      csp: config.csp,
      prototypeHardening: config.prototypeHardening,
      createCookieSessionStorageFactory: <T extends object>(cookieOptions: any) =>
        createFastifyCookieSessionStorageFactory<T>(
          this.log,
          cookieOptions,
          config.csp.disableEmbedding,
          config.basePath
        ),
      registerOnPreRouting: (handler) => {
        if (!this.fastify) throw new Error('Fastify instance not initialized');
        this.fastify.addHook('onRequest', adoptToFastifyOnPreRouting(handler, this.log));
      },
      registerOnPreAuth: (handler) => {
        if (!this.fastify) throw new Error('Fastify instance not initialized');
        this.fastify.addHook('preParsing', adoptToFastifyOnPreAuth(handler, this.log) as any);
      },
      registerAuth: (fn: AuthenticationHandler) => {
        if (!this.fastify) {
          throw new Error('Fastify instance not initialized');
        }
        if (this.authRegistered) {
          throw new Error('Auth interceptor was already registered');
        }
        this.authRegistered = true;
        registerFastifyAuthentication({
          fastify: this.fastify,
          fn,
          log: this.log,
          responseAdapter: this.responseAdapter,
          authState: this.authState,
          authRequestHeaders: this.authRequestHeaders,
          authResponseHeaders: this.authResponseHeaders,
        });
      },
      registerOnPostAuth: (handler) => {
        if (!this.fastify) throw new Error('Fastify instance not initialized');
        this.fastify.addHook('preHandler', adoptToFastifyOnPostAuth(handler, this.log));
      },
      registerOnPreResponse: (handler) => {
        if (!this.fastify) throw new Error('Fastify instance not initialized');
        this.fastify.addHook('onSend', adoptToFastifyOnPreResponse(handler, this.log));
      },
      getDeprecatedRoutes: this.getDeprecatedRoutes.bind(this),
      authRequestHeaders: this.authRequestHeaders,
      auth: {
        get: this.authState.get,
        isAuthenticated: this.authState.isAuthenticated,
      },
      getServerInfo: (): HttpServerInfo => ({
        name: config.name,
        hostname: config.host,
        port: config.port,
        // `HttpServerInfo.protocol` only models 'http' | 'https' | 'socket' today; HTTP/2 is
        // surfaced via the `'https'` value, mirroring how the Hapi backend reports it.
        protocol: config.ssl.enabled ? 'https' : 'http',
      }),
    };
  }

  public async start(): Promise<void> {
    if (!this.fastify) {
      throw new Error('Fastify HTTP server is not set up yet');
    }
    if (!this.config) {
      throw new Error('Fastify HTTP server configuration is missing');
    }
    if (this.stopped) {
      this.log.warn('start called after stop');
      return;
    }

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        this.configureRoute(route);
      }
    }

    this.flushBarePrefixRoutes();

    await this.fastify.ready();
    await this.fastify.listen({ port: this.config.port, host: this.config.host });
    this.listening = true;

    const protocol =
      this.config.protocol === 'http2' ? 'http2' : this.config.ssl.enabled ? 'https' : 'http';
    this.log.info(
      `Fastify http server running at ${protocol}://${this.config.host}:${this.config.port}`
    );
  }

  public async stop(): Promise<void> {
    this.stopped = true;
    if (!this.fastify) {
      this.listening = false;
      return;
    }
    try {
      await this.fastify.close();
    } catch (err) {
      this.log.warn(`Error while closing Fastify server: ${err?.message ?? err}`);
    }
    this.listening = false;
  }

  public getRouters(_options: GetRoutersOptions = {}): {
    routers: Router[];
    versionedRouters: CoreVersionedRouter[];
  } {
    const routers: Router[] = [];
    const versionedRouters: CoreVersionedRouter[] = [];
    for (const router of this.registeredRouters) {
      const r = router as Router;
      if (r.getRoutes({ excludeVersionedRoutes: true }).length > 0) routers.push(r);
      const v = r.versioned as unknown as CoreVersionedRouter;
      if (v.getRoutes().length > 0) versionedRouters.push(v);
    }
    return { routers, versionedRouters };
  }

  /** @internal */
  public getRedactedSessionIdGetter() {
    return this.redactedSessionIdGetter;
  }

  // -- private --

  private async installFastifyRequestBodyAdapters(
    fastify: FastifyInstance,
    config: HttpConfig
  ): Promise<void> {
    installHapiCompatibleJsonBodyParser(fastify);
    await registerFastifyMultipartAndKibanaBodyHook({
      fastify,
      maxPayloadBytes: config.maxPayload.getValueInBytes(),
    });
    registerFastifyFallbackStreamBodyParser(fastify);
  }

  /**
   * Mirrors {@link HttpServer}'s `setupRequestStateAssignment` `onRequest` ext: installs execution
   * context from the `x-kbn-context` header, request id, APM/OTel spans, ELU measurement, and initial
   * user-activity space — required for Elasticsearch `x-opaque-id` and tracing parity with Hapi.
   */
  private installKibanaRequestStateOnRequest(
    config: HttpConfig,
    executionContext?: InternalExecutionContextSetup,
    userActivity?: InternalUserActivityServiceSetup
  ): void {
    if (!this.fastify) {
      return;
    }

    this.fastify.addHook('onRequest', (req, _reply, done) => {
      const pathname = getFindMyWayLookupPath(req);
      const stop = startEluMeasurement(pathname, this.log, config.eluMonitor);

      const hapiishHeaders = req.headers as Record<string, string | string[] | undefined>;
      const parentContext = executionContext?.getParentContextFrom(hapiishHeaders);

      let spaceId: string | undefined;
      try {
        spaceId = getSpaceIdFromPath(pathname, config.basePath).spaceId;
      } catch {
        spaceId = parentContext?.space;
      }

      userActivity?.setInjectedContext({
        kibana: { space: { id: spaceId } },
      });

      if (executionContext && parentContext) {
        executionContext.set(parentContext);
        const labels = executionContext.getAsLabels();
        const { name, id, page } = labels;
        addSpanLabels(labels, {
          otelAttributes: omitBy(
            {
              'kibana.execution_context.name': name,
              'kibana.execution_context.id': id,
              'kibana.execution_context.page': page,
            },
            isNil
          ) as Record<string, string>,
        });
      }

      const hapiLikeRequest = {
        raw: { req: req.raw },
        headers: req.headers,
      } as unknown as Request;
      const requestId = getRequestId(hapiLikeRequest, config.requestId);
      executionContext?.setRequestId(requestId);

      const extReq = req as FastifyRequest & { app?: KibanaRequestState };
      if (extReq.app === undefined) {
        extReq.app = {} as KibanaRequestState;
      }
      const app = extReq.app;
      app.startTime = performance.now();
      app.requestId = requestId;
      app.requestUuid = uuidv4();
      app.measureElu = stop;
      app.traceId = apm.currentTraceIds['trace.id'] ?? trace.getActiveSpan()?.spanContext().traceId;
      app.span = apm.startSpan('pre-route handler middlewares');
      app.httpSpan = trace.getActiveSpan();
      app.otelSubSpan = this.createSubspanForRequest('pre-route handler middlewares');

      done();
    });
  }

  private createSubspanForRequest(name: string): OTelSpan {
    const span = trace.getTracer('kibana.http').startSpan(name);
    context.with(context.active(), () => {
      context.bind(context.active(), span);
    });
    return span;
  }

  private registerRouter(router: IRouter) {
    if (this.listening) {
      throw new Error('Routers can be registered only when HTTP server is stopped.');
    }
    this.registeredRouters.add(router);
  }

  private registerRouterAfterListening(router: IRouter) {
    if (this.listening) {
      for (const route of router.getRoutes()) {
        this.configureRoute(route);
      }
      this.flushBarePrefixRoutes();
    } else {
      this.registeredRouters.add(router);
    }
  }

  private configureRoute(route: RouterRoute): void {
    if (!this.fmw) return;
    const internalHandler = getInternalRouteHandler(route);
    if (!internalHandler) {
      this.log.warn(
        `Route ${route.method.toUpperCase()} ${
          route.path
        } has no internal handler attached - skipping in Fastify backend`
      );
      return;
    }

    const kibanaRouteOptions: KibanaRouteOptions = {
      xsrfRequired: route.options.xsrfRequired ?? !isSafeMethod(route.method),
      access: route.options.access ?? 'internal',
      deprecated: route.options.deprecated,
      security: route.security,
      ...omitBy({ excludeFromRateLimiter: route.options.excludeFromRateLimiter }, isNil),
    } as KibanaRouteOptions;

    const handler = this.makeRouteHandler(route, kibanaRouteOptions, internalHandler);
    const url = translateHapiPathToFastify(route.path);
    const method = route.method.toUpperCase() as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'
      | 'PATCH'
      | 'HEAD'
      | 'OPTIONS';
    this.registerFindMyWayRoute(
      method,
      url,
      ((req: FastifyRequest, reply: FastifyReply) => handler(req, reply)) as unknown as any,
      // The store travels with the route in find-my-way; the early route-lookup hook
      // copies it to `req.app.matchedRoute` so lifecycle hooks (onPreAuth/onPostAuth)
      // and the request builder can populate `KibanaRequest.route.options.security`
      // and friends without a second lookup.
      //
      // `wildcardName` carries the original Hapi catch-all param name (e.g. `path` for
      // `/{path*}`) so the dispatcher can rename `find-my-way`'s `*` capture to the
      // name the route handler's validation actually expects.
      {
        kibanaRoute: route,
        kibanaRouteOptions,
        wildcardName: extractHapiWildcardName(route.path),
      }
    );
  }

  /**
   * Registers the primary find-my-way pattern; bare-prefix companions are queued and applied
   * in {@link flushBarePrefixRoutes} so explicit routes win over wildcard-derived prefixes.
   */
  private registerFindMyWayRoute(
    method: string,
    url: string,
    handler: unknown,
    store?: Record<string, unknown>
  ): void {
    if (!this.fmw) return;
    this.fmw.on(method as any, url, handler as any, store);
    if (barePrefixPathFromFindMyWayWildcard(url) !== undefined) {
      this.pendingBarePrefixRegistrations.push({ method, wildcardUrl: url, handler, store });
    }
  }

  private flushBarePrefixRoutes(): void {
    if (!this.fmw) return;
    const entries = this.pendingBarePrefixRegistrations;
    this.pendingBarePrefixRegistrations = [];
    for (const entry of entries) {
      const barePrefix = barePrefixPathFromFindMyWayWildcard(entry.wildcardUrl);
      if (barePrefix === undefined) {
        continue;
      }
      if (this.fmw.hasRoute(entry.method as any, barePrefix)) {
        continue;
      }
      try {
        this.fmw.on(entry.method as any, barePrefix, entry.handler as any, entry.store);
      } catch (err) {
        if (err instanceof Error && err.message.includes('already declared for route')) {
          continue;
        }
        throw err;
      }
    }
  }

  private installFastifyDispatcher(
    fastify: FastifyInstance,
    fmw: FmwInstance<FmwHTTPVersion.V1>
  ): void {
    const dispatcher = async (req: FastifyRequest, reply: FastifyReply) => {
      const lookupPath = getFindMyWayLookupPath(req);
      const match = fmw.find(req.method as any, lookupPath);
      if (!match) {
        if (this.fallbackHandler) {
          (req as { params: unknown }).params = {};
          return this.fallbackHandler(req, reply, {});
        }
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Not Found`,
        });
      }
      // Pre-existing Fastify params would be empty; merge in find-my-way params so
      // downstream handlers can access them via `req.params`. If the matched route was
      // registered with a Hapi-style named wildcard (`/{path*}`), rename the unnamed
      // `*` capture to the original param name so route validation passes.
      const params: Record<string, string | undefined> = { ...(match.params || {}) };
      const wildcardName = (match as any).store?.wildcardName as string | undefined;
      if (wildcardName) {
        if ('*' in params) {
          params[wildcardName] = params['*'];
          delete params['*'];
        } else if (params[wildcardName] === undefined) {
          params[wildcardName] = '';
        }
      }
      const plainParams = toPlainRouteParams(params);
      (req as { params: unknown }).params = plainParams;
      return (match.handler as unknown as FmwHandler)(req, reply, plainParams);
    };

    // Catch-all: matches every method + every URL. Registered before `listen()`, so
    // Fastify allows it. From this point on, all routing decisions live in `fmw`.
    fastify.route({
      method: ALL_METHODS as unknown as Array<(typeof ALL_METHODS)[number]>,
      url: '/*',
      handler: dispatcher as FastifyRouteHandler as any,
    });
    fastify.route({
      method: ALL_METHODS as unknown as Array<(typeof ALL_METHODS)[number]>,
      url: '/',
      handler: dispatcher as FastifyRouteHandler as any,
    });
  }

  /**
   * Registers a `preParsing` Fastify hook that performs the find-my-way lookup ahead of
   * `onPreAuth`/`onPostAuth`/handler. The matched route, params, and Kibana-specific
   * options (security, access, xsrfRequired, etc.) are stashed on `req.app` so the
   * Hapi-shaped Kibana request builders downstream can expose them via
   * `KibanaRequest.route.options.security`.
   *
   * Registered before any consumer has a chance to call `registerOnPreAuth`, so it runs
   * first in the `preParsing` phase and is observable by every user-registered hook.
   */
  private installRouteLookupHook(
    fastify: FastifyInstance,
    fmw: FmwInstance<FmwHTTPVersion.V1>,
    defaultSocketTimeoutMs: number
  ): void {
    fastify.addHook('preParsing', (req, reply, _payload, done) => {
      const lookupPath = getFindMyWayLookupPath(req);
      const match = fmw.find(req.method as any, lookupPath);
      const app = ((req as any).app = (req as any).app ?? {});
      let matchedKibanaRoute: RouterRoute | undefined;
      if (match) {
        const store = (match as any).store as
          | {
              kibanaRoute?: RouterRoute;
              kibanaRouteOptions?: KibanaRouteOptions;
              wildcardName?: string;
            }
          | undefined;
        if (store?.kibanaRoute) {
          app.matchedRoute = store.kibanaRoute;
          matchedKibanaRoute = store.kibanaRoute;
        }
        if (store?.kibanaRouteOptions) {
          app.matchedKibanaRouteOptions = store.kibanaRouteOptions;
        } else {
          const routingPath = lookupPath;
          for (const [pattern] of this.staticDirectoryRouteInfo) {
            if (pathnameMatchesFastifyWildcardPattern(routingPath, pattern)) {
              app.matchedKibanaRouteOptions = STATIC_DIRECTORY_ROUTE_OPTIONS;
              break;
            }
          }
        }
        const params: Record<string, string | undefined> = { ...(match.params ?? {}) };
        let wildcardName = store?.wildcardName;
        if (!wildcardName) {
          const routingPath = lookupPath;
          for (const [pattern, wildName] of this.staticDirectoryRouteInfo) {
            if (pathnameMatchesFastifyWildcardPattern(routingPath, pattern)) {
              wildcardName = wildName;
              break;
            }
          }
        }
        if (wildcardName) {
          if ('*' in params) {
            params[wildcardName] = params['*'];
            delete params['*'];
          } else if (params[wildcardName] === undefined) {
            params[wildcardName] = '';
          }
        }
        const plainParams = toPlainRouteParams(params);
        app.matchedRouteParams = plainParams;
        // Mutate before `preValidation` (registerAuth): auth caches the Hapi-compat request,
        // which snapshots `req.params` for route validation. The dispatcher runs later and
        // would set params correctly, but without this hook assignment cached compat keeps
        // Fastify's `/*` params (`*` not renamed to `{path*}` names like `path`).
        (req as { params: unknown }).params = plainParams;
      }
      applyHapiCompatRequestTimeouts(req, reply, matchedKibanaRoute, defaultSocketTimeoutMs);
      attachFastifyPayloadReceiveTimeout(req, reply, _payload);
      done(null, _payload);
    });
  }

  /**
   * Returns a Hapi-shaped facade over the underlying Fastify instance. Kibana code paths
   * that historically reach into `setup.server` (metrics collector, redirect server,
   * `/api/oas` registration, etc.) speak Hapi: `server.route()`, `server.ext()`,
   * `server.events.on()`, `server.listener.getConnections()`. The facade adapts each of
   * those to a Fastify equivalent without leaking Fastify objects to the call sites.
   */
  private createHapiShapedServerFacade(
    fastify: FastifyInstance,
    hapiCompat: HapiCompatServer,
    listener: ReturnType<typeof getServerListener>
  ): unknown {
    const HCONTINUE = Symbol.for('kibana.hapi-compat.h.continue');
    const hToolkit = { continue: HCONTINUE };

    const wrapHapiOnRequest = (handler: (request: any, h: any) => unknown | Promise<unknown>) => {
      return async (req: FastifyRequest, _reply: FastifyReply) => {
        // Build a minimal Hapi-shaped request: `events` lets the metrics collector
        // observe socket disconnects; the rest is read-only metadata it never touches.
        const events = new EventEmitter();
        // Hapi fires 'disconnect' on raw socket close; mirror that on Fastify's raw req.
        req.raw.on('close', () => {
          if (!req.raw.complete) events.emit('disconnect');
        });
        const compatReq = { events, raw: req.raw, info: { received: Date.now() } };
        const result = await handler(compatReq, hToolkit);
        // h.continue is a sentinel; anything else is treated as a takeover-style return,
        // which the Hapi -> Fastify shim does not currently support.
        if (result !== HCONTINUE && result !== undefined) {
          this.log.warn(
            '[Fastify backend] server.ext("onRequest") handler returned a non-h.continue value; ignoring (takeover not supported in compat shim).'
          );
        }
        return undefined;
      };
    };

    const eventsFacade = {
      on: (eventName: string, handler: (request: any) => void) => {
        if (eventName !== 'response') {
          // Unknown events are ignored: Hapi exposes many event types, but Kibana only
          // observes 'response' on this surface. Log so a future caller has a breadcrumb.
          this.log.debug(
            `[Fastify backend] server.events.on('${eventName}') is not implemented in the compat shim; ignoring.`
          );
          return;
        }
        fastify.addHook('onResponse', (req, reply, done) => {
          const compatReq = {
            info: { received: (req as any).__receivedAt ?? Date.now() },
            response: { statusCode: reply.statusCode },
          };
          try {
            handler(compatReq);
          } catch (err) {
            this.log.warn(
              `[Fastify backend] server.events.on('response') handler threw: ${
                (err as Error)?.message ?? err
              }`
            );
          }
          done();
        });
      },
      removeListener: () => undefined,
    };

    // Stamp request received-time so onResponse handlers can compute durations.
    fastify.addHook('onRequest', (req, _reply, done) => {
      (req as any).__receivedAt = Date.now();
      done();
    });

    return new Proxy(fastify, {
      get: (target, prop, receiver) => {
        if (prop === 'route') return hapiCompat.route.bind(hapiCompat);
        if (prop === 'events') return eventsFacade;
        if (prop === 'listener') return listener;
        if (prop === 'ext') {
          return (eventName: string, handler: (req: any, h: any) => unknown) => {
            if (eventName !== 'onRequest') {
              this.log.debug(
                `[Fastify backend] server.ext('${eventName}') is not implemented in the compat shim; ignoring.`
              );
              return;
            }
            fastify.addHook('onRequest', wrapHapiOnRequest(handler) as any);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  private makeRouteHandler(
    route: RouterRoute,
    routeApp: KibanaRouteOptions,
    internalHandler: InternalRouteHandler
  ) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const app = ((req as any).app = (req as any).app ?? {});
        let compat = app[KIBANA_HAPI_COMPAT_REQUEST] as ReturnType<
          typeof buildHapiCompatRequestFromFastify
        > | null;
        if (!compat) {
          compat = buildHapiCompatRequestFromFastify(
            req,
            reply,
            route,
            routeApp,
            this.authRegistered
          );
          app[KIBANA_HAPI_COMPAT_REQUEST] = compat;
        }
        const kibanaResponse = await internalHandler(compat);
        return await this.responseAdapter.handle(kibanaResponse, reply);
      } catch (error) {
        this.log.error(
          `Unhandled error in Fastify route handler for ${route.method.toUpperCase()} ${
            route.path
          }: ${error?.message ?? error}`
        );
        // Delegate to {@link installFastifyGlobalErrorHandler}: Fastify also attaches a rejection
        // handler to the route promise; sending here after the global handler runs causes
        // ERR_HTTP_HEADERS_SENT and can terminate the process (e.g. CCS FTR when a route throws).
        throw error;
      }
    };
  }

  private getDeprecatedRoutes(): RouterDeprecatedApiDetails[] {
    return [];
  }

  private registerStaticDir(routePath: string, dirPath: string): void {
    if (!this.fmw) {
      throw new Error('Fastify HTTP server is not set up yet');
    }
    const resolvedRoot = nodePath.resolve(dirPath);
    // Hapi paths such as `/assets/{any*}` translate to Fastify-style `/assets/*`. The
    // captured wildcard is exposed by find-my-way as the `*` named param.
    // Paths such as `/ui/charts/{file}` become `/ui/charts/:file` — they must not get an
    // extra `/*` suffix (that breaks matching and leaves only `params['*']`, ignoring `:file`).
    const fastifyPath = translateHapiPathToFastify(routePath);
    const hasBraceWildcard = /\{[a-zA-Z0-9_]+\*\}/.test(routePath);
    const url =
      fastifyPath.endsWith('*') || hasBraceWildcard || fastifyPath.includes(':')
        ? fastifyPath
        : `${fastifyPath.endsWith('/') ? fastifyPath : `${fastifyPath}/`}*`;

    const handler: FmwHandler = async (req, reply, params) => {
      const wildcardValue = staticRelativePathFromParams(routePath, params);
      const requested = nodePath.normalize(nodePath.join(resolvedRoot, wildcardValue));
      // Containment check: prevent traversal escapes via `..`.
      if (requested !== resolvedRoot && !requested.startsWith(resolvedRoot + nodePath.sep)) {
        return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'Forbidden' });
      }
      try {
        const stat = await fs.promises.stat(requested);
        if (!stat.isFile()) {
          return reply
            .code(404)
            .send({ statusCode: 404, error: 'Not Found', message: 'Not Found' });
        }
        const acceptEncoding = req.headers['accept-encoding'];
        const resolved = await resolvePrecompressedStaticPath(
          requested,
          typeof acceptEncoding === 'string' ? acceptEncoding : undefined
        );
        const fileStat = await fs.promises.stat(resolved.path);
        const contentType = mime.lookup(requested) || 'application/octet-stream';
        const acceptedEncodings = orderPrecompressedEncodings(
          typeof acceptEncoding === 'string' ? acceptEncoding : undefined
        );
        const compression = this.config?.compression;
        const dynamicEncoding =
          !resolved.contentEncoding && compression?.enabled
            ? acceptedEncodings.find(
                (enc) => enc === 'gzip' || (enc === 'br' && compression.brotli.enabled)
              )
            : undefined;
        reply
          .header('cache-control', 'must-revalidate')
          .header('vary', 'accept-encoding')
          .header('content-type', mime.contentType(contentType) || contentType);
        if (resolved.contentEncoding || dynamicEncoding) {
          reply.header('content-encoding', resolved.contentEncoding ?? dynamicEncoding);
        }
        if (dynamicEncoding) {
          if (reply.hasHeader('content-length')) {
            reply.removeHeader('content-length');
          }
        } else {
          reply.header('content-length', String(fileStat.size));
        }
        // Stream from disk so a single Kibana process can serve large/many static
        // assets without buffering each file in memory. Fastify pipes Readable
        // streams natively and finalizes the reply when the stream ends.
        const fileStream = fs.createReadStream(resolved.path);
        if (dynamicEncoding === 'gzip') {
          return reply.send(fileStream.pipe(createGzip()));
        }
        if (dynamicEncoding === 'br') {
          return reply.send(
            fileStream.pipe(
              createBrotliCompress({
                params: {
                  [zlibConstants.BROTLI_PARAM_QUALITY]: compression?.brotli.quality ?? 3,
                },
              })
            )
          );
        }
        return reply.send(fileStream);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return reply
            .code(404)
            .send({ statusCode: 404, error: 'Not Found', message: 'Not Found' });
        }
        this.log.warn(`Error serving static asset ${requested}: ${err?.message ?? err}`);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Internal Server Error',
        });
      }
    };
    this.registerFindMyWayRoute('GET', url, handler as unknown as any);
    this.registerFindMyWayRoute('HEAD', url, handler as unknown as any);
    const wildName = extractHapiWildcardName(routePath);
    this.staticDirectoryRouteInfo.set(url, wildName);
    // Named-param static routes (e.g. `/sha/ui/charts/:file`) need a splat-style prefix for
    // {@link pathnameMatchesFastifyWildcardPattern} during early route lookup / auth.
    if (!url.endsWith('*') && fastifyPath.includes(':')) {
      const prefixStar = `${fastifyPath.slice(0, fastifyPath.lastIndexOf('/'))}/*`;
      this.staticDirectoryRouteInfo.set(prefixStar, wildName);
    }
    const bareForStatic = barePrefixPathFromFindMyWayWildcard(url);
    if (bareForStatic !== undefined) {
      this.staticDirectoryRouteInfo.set(bareForStatic, wildName);
    }
  }
}
