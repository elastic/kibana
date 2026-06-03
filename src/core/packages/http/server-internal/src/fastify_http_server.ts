/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import { firstValueFrom, take } from 'rxjs';
import type { Observable } from 'rxjs';
import Fastify from 'fastify';
import FindMyWay from 'find-my-way';
import type { HTTPVersion as FmwHTTPVersion, Instance as FmwInstance } from 'find-my-way';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as nodePath from 'path';
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
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { InternalUserActivityServiceSetup } from '@kbn/core-user-activity-server-internal';
import type {
  CoreVersionedRouter,
  InternalRouteHandler,
  Router,
} from '@kbn/core-http-router-server-internal';
import {
  CoreKibanaRequest,
  KibanaResponse,
  formatErrorMeta,
  getInternalRouteHandler,
  kibanaResponseFactory,
} from '@kbn/core-http-router-server-internal';
import {
  isUnauthorizedError as isElasticsearchUnauthorizedError,
  type UnauthorizedError as EsUnauthorizedError,
} from '@kbn/es-errors';
import type {
  IRouter,
  AuthenticationHandler,
  KibanaRequest,
  KibanaRequestState,
  KibanaRouteOptions,
  OnPreAuthHandler,
  OnPostAuthHandler,
  OnPreResponseHandler,
  OnPreRoutingHandler,
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
import {
  FastifyResponseAdapter,
  finalizeReplySetCookieHeaders,
  flushPendingCookieWrites,
  stripCharsetFromNdjsonContentTypeHeader,
  syncNodeResponseHeadersToFastifyReply,
} from './fastify/fastify_response_adapter';
import {
  buildHapiCompatRequestFromFastify,
  toPlainRouteParams,
} from './fastify/fastify_to_hapi_request';
import { kibanaResponseFromRouteHandlerError } from './fastify/kibana_route_handler_errors';
import {
  adoptToFastifyOnPostAuth,
  adoptToFastifyOnPreAuth,
  adoptToFastifyOnPreResponse,
  adoptToFastifyOnPreRouting,
  buildKibanaRequest,
  isLifecycleShortCircuited,
} from './fastify/fastify_lifecycle';
import { getEcsResponseLog } from './logging';
import {
  findMyWayRouteMatch,
  getFindMyWayLookupPath,
  restoreTrailingSlashInWildcardParam,
  routeMatchHasEmptyNamedPathParam,
  type GlobalCatchAllRoute,
} from './fastify/find_my_way_lookup_path';
import { extractHapiWildcardName, translateHapiPathToFastify } from './fastify/translate_path';
import { HapiCompatServer } from './fastify/hapi_compat_server';
import { createFastifyCookieSessionStorageFactory } from './fastify/fastify_cookie_session_storage';
import { KIBANA_HAPI_COMPAT_REQUEST, registerFastifyAuthentication } from './fastify/fastify_auth';
import { installHapiCompatibleJsonBodyParser } from './fastify/install_hapi_compatible_json_body_parser';
import { installHapiCompatibleUrlEncodedBodyParser } from './fastify/install_hapi_compatible_urlencoded_body_parser';
import { installFastifyGlobalErrorHandler } from './fastify/fastify_global_error_handler';
import { registerFastifyMultipartAndKibanaBodyHook } from './fastify/fastify_multipart_kibana_body';
import { registerFastifyFallbackStreamBodyParser } from './fastify/register_fastify_fallback_stream_body_parser';
import { resolvePrecompressedStaticPath } from './fastify/precompressed_static_file';
import {
  getRequestAcceptEncoding,
  installFastifyCompression,
} from './fastify/install_fastify_compression';
import { installFastifyCors } from './fastify/install_fastify_cors';
import { populateMatchedRouteFromFindMyWay } from './fastify/fastify_route_lookup';
import { KIBANA_LIFECYCLE_SHORT_CIRCUITED } from './fastify/fastify_lifecycle';

/** Upper bound for Fastify's raw body limit — must cover saved_objects `_import` (see `savedObjects.maxImportPayloadBytes`). */
const FASTIFY_BODY_LIMIT_CEILING_BYTES = 36 * 1024 * 1024;

const INTERNAL_ERROR_MESSAGE =
  'An internal server error occurred. Check Kibana server logs for details.';

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

  /**
   * Hapi-shaped facade over the Node listener (see {@link HttpServer.server}).
   * Integration tests reach `http.httpServer.server.listener` via supertest.
   */
  private server?: { listener: ReturnType<typeof getServerListener> };
  private fastify?: FastifyInstance;
  private fmw?: FmwInstance<FmwHTTPVersion.V1>;
  private globalCatchAllRoute?: GlobalCatchAllRoute;
  private fallbackHandler?: FmwHandler;
  private config?: HttpConfig;
  private listening = false;
  private stopping = false;
  private stopped = false;
  private lifecycleHooksInstalledOnStart = false;
  private fastifyReady = false;
  private userActivity?: InternalUserActivityServiceSetup;
  private redactedSessionIdGetter?: (request: KibanaRequest) => Promise<string | undefined>;
  private readonly registeredRouters = new Set<IRouter>();
  private authRegistered = false;
  private sealPromise?: Promise<void>;

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
    private readonly shutdownTimeout$: Observable<Duration>
  ) {
    // Same logger id as {@link HttpServer} so FTR/CLI wait patterns match (e.g. config.status.ts).
    this.log = coreContext.logger.get('http', 'server', name);
    this.authState = new AuthStateStorage(() => this.authRegistered);
    this.authRequestHeaders = new AuthHeadersStorage();
    this.authResponseHeaders = new AuthHeadersStorage();
  }

  public isListening(): boolean {
    return this.server?.listener?.listening === true || this.listening;
  }

  /** @internal */
  public setRedactedSessionIdGetter(
    getter: (request: KibanaRequest) => Promise<string | undefined>
  ) {
    this.redactedSessionIdGetter = getter;
  }

  /**
   * Seals the Fastify instance with `ready()` after {@link HttpService} registers core lifecycle
   * hooks. Must run before `supertest(server.listener)` against a server that has not `start()`ed.
   */
  /** Ensures `fastify.ready()` ran so hooks and parsers are wired before handling traffic. */
  private async ensureSealed(): Promise<void> {
    if (!this.fastify || this.fastifyReady) {
      return;
    }
    if (!this.sealPromise) {
      this.sealPromise = this.seal();
    }
    await this.sealPromise;
  }

  public async seal(): Promise<void> {
    if (!this.fastify || this.fastifyReady) {
      return;
    }
    // Last in the `preParsing` chain: some plugins still yield `undefined` payloads for
    // bodyless requests; Fastify's runner then crashes reading `.length` during parsing.
    this.fastify.addHook('preParsing', async (_req, _reply, payload) => {
      return payload === undefined ? Buffer.alloc(0) : payload;
    });
    await this.fastify.ready();
    this.fastifyReady = true;
  }

  public async setup({
    config$,
    executionContext,
    userActivity,
  }: HttpServerSetupOptions): Promise<HttpServerSetup> {
    const config = await firstValueFrom(config$);
    this.config = config;
    this.userActivity = userActivity;

    this.log.debug(
      `[experimental] Starting Kibana with the Fastify HTTP backend. Intended as a drop-in for the Hapi server contract; report behavioral differences during review.`
    );

    // Reuse the Kibana TLS/HTTP2 listener factory so `server.protocol`, TLS, etc. keep
    // working. Fastify accepts an arbitrary listener via `serverFactory`.
    const listener = getServerListener(config);
    listener.prependListener('request', (req, res) => {
      if (!this.stopping && !this.stopped) {
        return;
      }
      if (res.headersSent) {
        return;
      }
      const body = JSON.stringify({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Kibana is shutting down and not accepting new incoming requests',
      });
      (req as { __kibanaStoppedResponse?: boolean }).__kibanaStoppedResponse = true;
      res.statusCode = 503;
      res.setHeader('Connection', 'close');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.end(body);
    });
    this.fastify = Fastify({
      logger: false,
      bodyLimit: Math.max(config.maxPayload.getValueInBytes(), FASTIFY_BODY_LIMIT_CEILING_BYTES),
      serverFactory: ((handler: (req: any, res: any) => void) => {
        listener.on('request', (req, res) => {
          if ((req as { __kibanaStoppedResponse?: boolean }).__kibanaStoppedResponse) {
            return;
          }
          handler(req, res);
        });
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

    // Must run before any other `onRequest` hook: `preParsing` reads route-context hooks
    // populated only after `fastify.ready()` (see Fastify `preReady`).
    this.fastify.addHook('onRequest', async () => {
      if (!this.fastifyReady && !this.authRegistered) {
        await this.ensureSealed();
      }
    });

    installFastifyGlobalErrorHandler(this.fastify, this.log);
    await installFastifyCompression(this.fastify, config, this.log);
    await installFastifyCors(this.fastify, config, this.log);

    this.fastify.addHook('onRequest', async (req, reply) => {
      if (
        reply.raw.headersSent ||
        (req.raw as { __kibanaStoppedResponse?: boolean }).__kibanaStoppedResponse
      ) {
        return reply;
      }
      if (!this.stopping && !this.stopped) {
        return;
      }
      return reply.code(503).header('Connection', 'close').send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Kibana is shutting down and not accepting new incoming requests',
      });
    });

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
    // Register before body parsers and any other `preParsing` hooks so `request.app.matchedRoute`
    // is set when content-type parsers run (e.g. Console proxy `parse: false` + `output: stream`).
    this.installRouteLookupHook(this.fastify, this.fmw, config.socketTimeout);
    await this.installFastifyRequestBodyAdapters(this.fastify, config);
    this.installRedactedSessionIdPostAuthHandler();

    this.fastify.addHook('onSend', async (req, reply, payload) => {
      await flushPendingCookieWrites(req);
      syncNodeResponseHeadersToFastifyReply(reply);
      finalizeReplySetCookieHeaders(reply);
      stripCharsetFromNdjsonContentTypeHeader(reply);
      return payload;
    });

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
    this.server = serverFacade as FastifyHttpServer['server'];

    this.setupBasePathRewrite(config, basePathService);
    this.setupGracefulShutdownHandlers();
    this.setupResponseLogging();

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
      registerOnPreRouting: (handler: OnPreRoutingHandler) => {
        if (!this.fastify) throw new Error('Fastify instance not initialized');
        this.fastify.addHook('onRequest', adoptToFastifyOnPreRouting(handler, this.log));
      },
      registerOnPreAuth: (handler: OnPreAuthHandler) => {
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
        if (this.fastifyReady) {
          throw new Error('Auth interceptor cannot be registered after the HTTP server is sealed');
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
          registerOnPreResponse: (handler) => {
            if (!this.fastify) {
              throw new Error('Fastify instance not initialized');
            }
            this.fastify.addHook('onSend', adoptToFastifyOnPreResponse(handler, this.log));
          },
        });
      },
      registerOnPostAuth: (handler: OnPostAuthHandler) => {
        if (!this.fastify) throw new Error('Fastify instance not initialized');
        this.fastify.addHook('preHandler', adoptToFastifyOnPostAuth(handler, this.log));
      },
      registerOnPreResponse: (handler: OnPreResponseHandler) => {
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
      prepareForIncomingRequests: async () => {
        if (this.authRegistered) {
          return;
        }
        await this.ensureSealed();
      },
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

    this.installLifecycleHooksOnStart();

    if (!this.fastifyReady) {
      await this.seal();
    }
    await this.fastify.listen({ port: this.config.port, host: this.config.host });
    this.listening = true;

    // Match {@link HttpServer.start} log line so FTR/CLI can wait on the same pattern (e.g. config.status.ts).
    const serverPath =
      this.config.rewriteBasePath && this.config.basePath !== undefined ? this.config.basePath : '';
    const protocol = this.config.ssl.enabled ? 'https' : 'http';
    const uri = `${protocol}://${this.config.host}:${this.config.port}`;
    this.log.info(`http server running at ${uri}${serverPath}`);
  }

  public async stop(): Promise<void> {
    this.stopping = true;
    if (!this.fastify) {
      this.stopping = false;
      this.stopped = true;
      this.listening = false;
      return;
    }
    this.stopped = true;
    try {
      const shutdownTimeout = await firstValueFrom(this.shutdownTimeout$.pipe(take(1)));
      await Promise.race([
        this.fastify.close(),
        new Promise<void>((resolve) => setTimeout(resolve, shutdownTimeout.asMilliseconds())),
      ]);
    } catch (err) {
      this.log.warn(`Error while closing Fastify server: ${err?.message ?? err}`);
    }
    this.stopping = false;
    this.listening = false;
  }

  /** Mirrors {@link HttpServer}'s `onPostAuth` redacted session id assignment (checks getter at request time). */
  private installRedactedSessionIdPostAuthHandler(): void {
    if (!this.fastify) {
      return;
    }
    this.fastify.addHook('preHandler', async (req, reply) => {
      if (!this.redactedSessionIdGetter) {
        return;
      }
      try {
        const kibanaRequest = CoreKibanaRequest.from(buildKibanaRequest(req, reply));
        const redactedSessionId = await this.redactedSessionIdGetter(kibanaRequest);
        const app = (req as { app?: KibanaRequestState }).app;
        if (app) {
          app.redactedSessionId = redactedSessionId;
        }
      } catch {
        // leave session id undefined
      }
    });
  }

  private setupGracefulShutdownHandlers(): void {
    this.registerOnPreRoutingFromSetup((request, response, toolkit) => {
      if (this.stopping || this.stopped) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Kibana is shutting down and not accepting new incoming requests' },
        });
      }
      return toolkit.next();
    });
  }

  private setupBasePathRewrite(config: HttpConfig, basePathService: BasePath): void {
    if (config.basePath === undefined || !config.rewriteBasePath) {
      return;
    }

    this.registerOnPreRoutingFromSetup((request, response, toolkit) => {
      const oldUrl = request.url.pathname + request.url.search;
      const newURL = basePathService.remove(oldUrl);
      if (newURL !== oldUrl) {
        return toolkit.rewriteUrl(newURL);
      }
      return response.notFound();
    });
  }

  private registerOnPreRoutingFromSetup(handler: OnPreRoutingHandler): void {
    if (!this.fastify) {
      throw new Error('Fastify instance not initialized');
    }
    this.fastify.addHook('onRequest', adoptToFastifyOnPreRouting(handler, this.log));
  }

  private setupResponseLogging(): void {
    if (!this.fastify) {
      return;
    }
    const log = this.coreContext.logger.get('http', 'server', 'response');
    this.fastify.addHook('onResponse', (req, reply, done) => {
      if (!log.isLevelEnabled('debug')) {
        done();
        return;
      }
      const compatReq = buildKibanaRequest(req, reply) as unknown as Request;
      const received = (req as { __receivedAt?: number }).__receivedAt ?? Date.now();
      const now = Date.now();
      const compatWithInfo = compatReq as unknown as { info: Record<string, unknown> };
      compatWithInfo.info = {
        ...compatWithInfo.info,
        received,
        responded: now,
        completed: now,
        remoteAddress: req.ip,
        referrer: (req.headers.referer as string | undefined) ?? '',
      };
      (compatReq as unknown as { response: unknown }).response = {
        statusCode: reply.statusCode,
        headers: reply.getHeaders(),
      };
      const { message, meta } = getEcsResponseLog(compatReq, this.log);
      if (message) {
        log.debug(message, meta);
      }
      done();
    });
  }

  /**
   * Installed from {@link start} after all `registerOnPostAuth` handlers are registered so these
   * run last in the `preHandler` phase (mirrors Hapi `onPreHandler` after `onPostAuth`).
   */
  private installLifecycleHooksOnStart(): void {
    if (!this.fastify || this.lifecycleHooksInstalledOnStart) {
      return;
    }
    this.lifecycleHooksInstalledOnStart = true;

    this.fastify.addHook('preHandler', (req, _reply, done) => {
      const app = (req as { app?: KibanaRequestState }).app;
      if (app) {
        app.span?.end();
        app.otelSubSpan?.end();
        app.span = null;
        app.otelSubSpan = undefined;
      }

      const compatReq = buildKibanaRequest(req, _reply);
      const user = this.authState.get<AuthenticatedUser>(compatReq).state ?? null;
      const { redactedSessionId } = app ?? {};
      this.userActivity?.setInjectedContext({
        client: req.ip
          ? {
              ip: req.ip,
              address: req.ip,
            }
          : undefined,
        user: user
          ? {
              id: user.profile_uid,
              name: user.username,
              email: user.email,
              roles: user.roles ? [...user.roles] : undefined,
            }
          : undefined,
        session: {
          id: redactedSessionId,
        },
        http: {
          request: {
            referrer: (req.headers.referer as string | undefined) ?? '',
          },
        },
      });

      done();
    });

    this.fastify.addHook('onSend', (req, reply, payload, done) => {
      const app = (req as { app?: KibanaRequestState }).app;
      if (app && !app.otelSubSpan) {
        app.otelSubSpan = this.createSubspanForRequest('post-route handler middlewares');
      }
      done(null, payload);
    });

    this.fastify.addHook('onResponse', (req, _reply, done) => {
      const app = (req as { app?: KibanaRequestState }).app;
      app?.otelSubSpan?.end();
      done();
    });
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
    installHapiCompatibleUrlEncodedBodyParser(fastify);
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
    const routeHandler = ((req: FastifyRequest, reply: FastifyReply) =>
      handler(req, reply)) as unknown as any;
    const wildcardName = extractHapiWildcardName(route.path);
    if (route.path === '/{path*}' && wildcardName) {
      this.globalCatchAllRoute = {
        handler: routeHandler as GlobalCatchAllRoute['handler'],
        store: {
          kibanaRoute: route,
          kibanaRouteOptions,
          wildcardName,
        },
        wildcardName,
      };
    }
    this.registerFindMyWayRoute(
      method,
      url,
      routeHandler, // The store travels with the route in find-my-way; the early route-lookup hook
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
        wildcardName,
      }
    );
    // Hapi automatically serves HEAD for GET routes; find-my-way requires an explicit entry.
    if (method === 'GET') {
      this.registerFindMyWayRoute('HEAD', url, routeHandler, {
        kibanaRoute: route,
        kibanaRouteOptions,
        wildcardName: extractHapiWildcardName(route.path),
      });
    }
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
      if (
        reply.raw.headersSent ||
        (req.raw as { __kibanaStoppedResponse?: boolean }).__kibanaStoppedResponse ||
        isLifecycleShortCircuited(req) ||
        reply.sent
      ) {
        return;
      }
      const match = findMyWayRouteMatch(
        fmw,
        String(req.method ?? 'GET'),
        req,
        this.globalCatchAllRoute
      );
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
        restoreTrailingSlashInWildcardParam(req, params, wildcardName);
      }
      const plainParams = toPlainRouteParams(params);
      const hasEmptyNamedParam = routeMatchHasEmptyNamedPathParam(plainParams, wildcardName);
      if (hasEmptyNamedParam) {
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
   * Registers a `preParsing` hook that performs find-my-way lookup after `onRequest`
   * {@link registerOnPreRouting} URL rewrites and before body parsing / `onPreAuth`.
   * Matched route metadata is stashed on `req.app` for `KibanaRequest.route.options.security`.
   *
   * Registered during `setup()` before consumers call `registerOnPreAuth` (which adds more
   * `preParsing` hooks), so lookup always runs first in that phase.
   */
  private installRouteLookupHook(
    fastify: FastifyInstance,
    fmw: FmwInstance<FmwHTTPVersion.V1>,
    defaultSocketTimeoutMs: number
  ): void {
    const lookupOptions = {
      fmw,
      getLookupPath: getFindMyWayLookupPath,
      globalCatchAll: this.globalCatchAllRoute,
      staticDirectoryRouteInfo: this.staticDirectoryRouteInfo,
      staticDirectoryRouteOptions: STATIC_DIRECTORY_ROUTE_OPTIONS,
      pathnameMatchesWildcardPattern: pathnameMatchesFastifyWildcardPattern,
      defaultSocketTimeoutMs,
    };
    fastify.addHook('preParsing', async (req, reply, payload) => {
      populateMatchedRouteFromFindMyWay(req, reply, lookupOptions);

      const route = (req as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
      const maxBytes = route?.options?.body?.maxBytes;
      const contentLengthHeader = req.headers['content-length'];
      if (maxBytes != null && contentLengthHeader !== undefined && contentLengthHeader !== '') {
        const contentLength = Number(contentLengthHeader);
        if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
          const app = ((req as { app?: Record<symbol, boolean> }).app =
            (req as { app?: Record<symbol, boolean> }).app ?? {});
          app[KIBANA_LIFECYCLE_SHORT_CIRCUITED] = true;
          await reply.code(413).send({
            statusCode: 413,
            error: 'Request Entity Too Large',
            message: `Payload content length greater than maximum allowed: ${maxBytes}`,
          });
          return Buffer.alloc(0);
        }
      }

      // Fastify's `preParsingHookRunner` assumes a defined payload (reads `.length` on streams);
      // GET/HEAD/DELETE without a body may pass `undefined` here; Fastify expects a
      // stream/buffer/string (reads `.length`), not `undefined`.
      return payload === undefined ? Buffer.alloc(0) : payload;
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
      return async (req: FastifyRequest, reply: FastifyReply) => {
        // Build a minimal Hapi-shaped request: `events` lets the metrics collector
        // observe socket disconnects; the rest is read-only metadata it never touches.
        const events = new EventEmitter();
        // Hapi fires 'disconnect' when the connection closes before the response completes.
        req.raw.on('close', () => {
          if (!reply.sent && !reply.raw.writableEnded) {
            events.emit('disconnect');
          }
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

  /**
   * Copies auth results from a prior Hapi-compat request (e.g. cached during `preValidation`)
   * onto the handler's compat object. {@link AuthStateStorage} keys off the compat reference,
   * so this must run whenever the handler rebuilds compat from {@link configureRoute} metadata.
   */
  private mergeAuthStateOntoHapiCompat(
    prevCompat: Request | undefined,
    compat: ReturnType<typeof buildHapiCompatRequestFromFastify>
  ): ReturnType<typeof buildHapiCompatRequestFromFastify> {
    if (!prevCompat) {
      return compat;
    }

    const prevAuth = (prevCompat as { auth?: { isAuthenticated: boolean; credentials?: unknown } })
      .auth;
    if (prevAuth?.isAuthenticated) {
      (compat as { auth: typeof prevAuth }).auth = prevAuth;
    }

    try {
      const prevKibanaRequest = CoreKibanaRequest.from(prevCompat, undefined, false);
      const newKibanaRequest = CoreKibanaRequest.from(compat, undefined, false);
      // `registerAuth` may call `toolkit.authenticated()` without `state`; WeakMap still records auth.
      if (this.authState.isAuthenticated(prevKibanaRequest)) {
        const { state } = this.authState.get(prevKibanaRequest);
        this.authState.set(newKibanaRequest, state);
      }
      const requestHeaders = this.authRequestHeaders.get(prevKibanaRequest);
      if (requestHeaders) {
        this.authRequestHeaders.set(newKibanaRequest, requestHeaders);
      }
      const responseHeaders = this.authResponseHeaders.get(prevKibanaRequest);
      if (responseHeaders) {
        this.authResponseHeaders.set(newKibanaRequest, responseHeaders);
      }
    } catch {
      // Previous compat may not be suitable for CoreKibanaRequest (e.g. partial test doubles).
    }

    return compat;
  }

  private makeRouteHandler(
    route: RouterRoute,
    routeApp: KibanaRouteOptions,
    internalHandler: InternalRouteHandler
  ) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      const app = ((req as any).app = (req as any).app ?? {});
      let apmSpan: ReturnType<typeof apm.startSpan> | null | undefined;
      try {
        const prevCompat = app[KIBANA_HAPI_COMPAT_REQUEST] as
          | ReturnType<typeof buildHapiCompatRequestFromFastify>
          | undefined;
        // Always rebuild from the registered route: auth/lifecycle may have cached compat built
        // via {@link buildKibanaRequest} before route lookup or with static-directory options.
        let compat = buildHapiCompatRequestFromFastify(
          req,
          reply,
          route,
          routeApp,
          this.authRegistered
        );
        compat = this.mergeAuthStateOntoHapiCompat(prevCompat, compat);
        app[KIBANA_HAPI_COMPAT_REQUEST] = compat;
        apmSpan = apm.startSpan('route handler');
        const kibanaResponse = await internalHandler(compat);
        apmSpan?.end();
        return await this.responseAdapter.handle(kibanaResponse, reply);
      } catch (error) {
        apm.captureError(error);
        apmSpan?.end();
        let compatForError = app[KIBANA_HAPI_COMPAT_REQUEST] as ReturnType<
          typeof buildHapiCompatRequestFromFastify
        > | null;
        if (!compatForError) {
          compatForError = buildHapiCompatRequestFromFastify(
            req,
            reply,
            route,
            routeApp,
            this.authRegistered
          );
        }
        const requestForLogging = compatForError as unknown as Request;

        // Match {@link Router.handle}: only ES 401s become HTTP 401. Other ResponseErrors
        // (e.g. 403 security_exception for insufficient privileges) must not — the browser
        // treats any 401 as a logout signal ({@link UnauthorizedResponseHttpInterceptor}).
        if (isElasticsearchUnauthorizedError(error)) {
          this.log.error(
            '401 Unauthorized',
            formatErrorMeta(401, { request: requestForLogging, error })
          );
          const esError = error as EsUnauthorizedError;
          const wwwAuthenticate =
            Object.entries(esError.headers ?? {}).find(
              ([key]) => key.toLowerCase() === 'www-authenticate'
            )?.[1] ?? 'Basic realm="Authorization Required"';
          return await this.responseAdapter.handle(
            kibanaResponseFactory.unauthorized({
              body: esError.message,
              headers: { 'www-authenticate': wwwAuthenticate as string },
            }),
            reply
          );
        }

        const mapped = kibanaResponseFromRouteHandlerError(error);
        if (mapped) {
          return await this.responseAdapter.handle(mapped, reply);
        }

        this.log.error(
          '500 Server Error',
          formatErrorMeta(500, { request: requestForLogging, error })
        );
        return await this.responseAdapter.handle(
          new KibanaResponse(500, { message: INTERNAL_ERROR_MESSAGE }, {}),
          reply
        );
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
            .code(403)
            .send({ statusCode: 403, error: 'Forbidden', message: 'Forbidden' });
        }
        const resolved = await resolvePrecompressedStaticPath(
          requested,
          getRequestAcceptEncoding(req)
        );
        const fileStat = await fs.promises.stat(resolved.path);
        const contentType = mime.lookup(requested) || 'application/octet-stream';
        const compressionEnabled = this.config?.compression.enabled ?? true;
        reply
          .header('cache-control', 'must-revalidate')
          .header('vary', 'accept-encoding')
          .header('content-type', mime.contentType(contentType) || contentType);
        if (resolved.contentEncoding) {
          reply.header('content-encoding', resolved.contentEncoding);
        }
        // Pre-compressed siblings and disabled compression have a known length; dynamic
        // compression is handled by `@fastify/compress` (variable output size).
        if (resolved.contentEncoding || !compressionEnabled) {
          reply.header('content-length', String(fileStat.size));
        }
        return reply.send(fs.createReadStream(resolved.path));
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
