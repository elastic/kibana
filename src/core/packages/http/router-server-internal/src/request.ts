/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { inspect } from 'util';
import type { Request, RouteOptions } from '@hapi/hapi';
import { fromEvent, NEVER } from 'rxjs';
import { shareReplay, first, filter } from 'rxjs';
import { isNil, omitBy } from 'lodash';
import type { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';
import type {
  KibanaRequest,
  Headers,
  RouteMethod,
  validBodyOutput,
  IKibanaSocket,
  RouteValidatorFullConfigRequest,
  KibanaRequestRoute,
  KibanaRequestEvents,
  KibanaRequestAuth,
  KibanaRequestState,
  KibanaRouteOptions,
  KibanaRequestRouteOptions,
  RawRequest,
  FakeRawRequest,
  HttpProtocol,
  RouteSecurityGetter,
  RouteSecurity,
} from '@kbn/core-http-server';
import {
  ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { RouteValidator } from './validator';
import { isSafeMethod } from './route';
import { KibanaSocket } from './socket';
import { patchRequest } from './patch_requests';

// patching at module load
patchRequest();

const requestSymbol = Symbol('request');

const isRouteSecurityGetter = (
  security?: RouteSecurityGetter | RecursiveReadonly<RouteSecurity>
): security is RouteSecurityGetter => {
  return typeof security === 'function';
};

/**
 * Core internal implementation of {@link KibanaRequest}
 * @internal
 * @remarks Only publicly exposed for consumers that need to forge requests using {@link CoreKibanaRequest.from}.
 *          All other usages should import and use the {@link KibanaRequest} interface instead.
 */
export class CoreKibanaRequest<
  Params = unknown,
  Query = unknown,
  Body = unknown,
  Method extends RouteMethod = any
> implements KibanaRequest<Params, Query, Body, Method>
{
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   * @internal
   */
  public static from<P, Q, B>(
    req: RawRequest,
    routeSchemas:
      | RouteValidator<P, Q, B>
      | RouteValidatorFullConfigRequest<P, Q, B>
      | undefined = undefined,
    withoutSecretHeaders: boolean = true
  ) {
    let requestParts: { params: P; query: Q; body: B };
    if (routeSchemas === undefined || isFakeRawRequest(req)) {
      requestParts = { query: {} as Q, params: {} as P, body: {} as B };
    } else {
      const routeValidator = RouteValidator.from<P, Q, B>(routeSchemas);
      const rawParts = sanitizeRequest(req);
      requestParts = CoreKibanaRequest.validate(rawParts, routeValidator);
    }
    return new CoreKibanaRequest(
      req,
      requestParts.params,
      requestParts.query,
      requestParts.body,
      withoutSecretHeaders
    );
  }

  /**
   * Validates the different parts of a request based on the schemas defined for
   * the route. Builds up the actual params, query and body object that will be
   * received in the route handler.
   * @internal
   */
  private static validate<P, Q, B>(
    raw: { params: unknown; query: unknown; body: unknown },
    routeValidator: RouteValidator<P, Q, B>
  ): {
    params: P;
    query: Q;
    body: B;
  } {
    const params = routeValidator.getParams(raw.params, 'request params');
    const query = routeValidator.getQuery(raw.query, 'request query');
    const body = routeValidator.getBody(raw.body, 'request body');
    return { query, params, body };
  }

  /** {@inheritDoc KibanaRequest.id} */
  public readonly id: string;
  /** {@inheritDoc KibanaRequest.uuid} */
  public readonly uuid: string;
  /** {@inheritDoc KibanaRequest.url} */
  public readonly url: URL;
  /** {@inheritDoc KibanaRequest.route} */
  public readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
  /** {@inheritDoc KibanaRequest.headers} */
  public readonly headers: Headers;
  /** {@inheritDoc KibanaRequest.isSystemRequest} */
  public readonly isSystemRequest: boolean;
  /** {@inheritDoc KibanaRequest.socket} */
  public readonly socket: IKibanaSocket;
  /** {@inheritDoc KibanaRequest.events} */
  public readonly events: KibanaRequestEvents;
  /** {@inheritDoc KibanaRequest.auth} */
  public readonly auth: KibanaRequestAuth;
  /** {@inheritDoc KibanaRequest.isFakeRequest} */
  public readonly isFakeRequest: boolean;
  /** {@inheritDoc KibanaRequest.isInternalApiRequest} */
  public readonly isInternalApiRequest: boolean;
  /** {@inheritDoc KibanaRequest.rewrittenUrl} */
  public readonly rewrittenUrl?: URL;
  /** {@inheritDoc KibanaRequest.httpVersion} */
  public readonly httpVersion: string;
  /** {@inheritDoc KibanaRequest.apiVersion} */
  public readonly apiVersion: undefined;
  /** {@inheritDoc KibanaRequest.protocol} */
  public readonly protocol: HttpProtocol;
  /** {@inheritDoc KibanaRequest.authzResult} */
  public readonly authzResult?: Record<string, boolean>;

  /** @internal */
  protected readonly [requestSymbol]!: Request;

  constructor(
    request: RawRequest,
    public readonly params: Params,
    public readonly query: Query,
    public readonly body: Body,
    // @ts-expect-error we will use this flag as soon as http request proxy is supported in the core
    // until that time we have to expose all the headers
    private readonly withoutSecretHeaders: boolean
  ) {
    // The `requestId` and `requestUuid` properties will not be populated for requests that are 'faked' by internal systems that leverage
    // KibanaRequest in conjunction with scoped Elasticsearch and SavedObjectsClient in order to pass credentials.
    // In these cases, the ids default to a newly generated UUID.
    const appState = request.app as KibanaRequestState | undefined;
    const isRealReq = isRealRawRequest(request);

    this.id = appState?.requestId ?? uuidv4();
    this.uuid = appState?.requestUuid ?? uuidv4();
    this.rewrittenUrl = appState?.rewrittenUrl;
    this.authzResult = appState?.authzResult;
    this.injectHostInfo(request);

    this.url = request.url ?? new URL('https://fake-request/url');
    this.headers = isRealReq ? deepFreeze({ ...request.headers }) : request.headers;
    this.isSystemRequest = this.headers['kbn-system-request'] === 'true';
    this.isFakeRequest = !isRealReq;
    // set to false if elasticInternalOrigin is explicitly set to false
    // otherwise check for the header or the query param
    this.isInternalApiRequest =
      this.url?.searchParams?.get(ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM) === 'false'
        ? false
        : X_ELASTIC_INTERNAL_ORIGIN_REQUEST in this.headers ||
          this.url?.searchParams?.has(ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM);

    // prevent Symbol exposure via Object.getOwnPropertySymbols()
    Object.defineProperty(this, requestSymbol, {
      value: request,
      enumerable: false,
    });

    this.httpVersion = isRealReq ? getHttpVersionFromRequest(request) : '1.0';
    this.apiVersion = undefined;
    this.protocol = getProtocolFromHttpVersion(this.httpVersion);

    this.route = deepFreeze(this.getRouteInfo(request));
    this.socket = isRealReq
      ? new KibanaSocket(request.raw.req.socket)
      : KibanaSocket.getFakeSocket();
    this.events = this.getEvents(request);

    this.auth = {
      // missing in fakeRequests, so we cast to false
      isAuthenticated: request.auth?.isAuthenticated ?? false,
    };
  }

  /**
   * Hapi does not officially support HTTP2 at the moment.
   * - On HTTP/2 the 'Host:' header is replaced by ':authority:'.
   * - Thus, for HTTP/2 requests, Hapi's request.url getter defaults to using
   *   the server host information to build the full URL.
   * - If we configure Kibana to use a "bare" IPv6 host (without square brackets),
   *   this causes Hapi's request.url getter to try to build ambiguous invalid URLs.
   *
   * Note that an IPv6 address like 2001:db8::1:8080 would be ambiguous,
   * as 8080 could be interpreted as the last segment of the IP address rather than the port.
   *
   * This method alters the original Hapi Request object,
   * injecting the missing 'Host:' header if the ':authority:' information is present (i.e. HTTP/2 request).
   * This way, the URL is no longer built using server host information,
   * which causes https://github.com/elastic/kibana/issues/236380 when using IPv6 server.host
   *
   * TODO remove this when https://github.com/hapijs/hapi/issues/4560 is addressed
   * @param request the request to 'decorate'
   */
  injectHostInfo(request: RawRequest) {
    const r = request as RawRequest & { info: Record<string, any> };
    if (typeof r.info === 'object' && !r.info.host && r.headers[':authority']) {
      r.info.host = r.headers[':authority'];
    }
  }

  toString() {
    return `[CoreKibanaRequest id="${this.id}" method="${this.route.method}" url="${this.url}" fake="${this.isFakeRequest}" system="${this.isSystemRequest}" api="${this.isInternalApiRequest}"]`;
  }

  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      url: `${this.url}`,
      isFakeRequest: this.isFakeRequest,
      isSystemRequest: this.isSystemRequest,
      isInternalApiRequest: this.isInternalApiRequest,
      auth: {
        isAuthenticated: this.auth.isAuthenticated,
      },
      route: this.route,
      authzResult: this.authzResult,
      apiVersion: this.apiVersion,
    };
  }

  [inspect.custom]() {
    return this.toJSON();
  }

  private getEvents(request: RawRequest): KibanaRequestEvents {
    if (isFakeRawRequest(request)) {
      return {
        aborted$: NEVER,
        completed$: NEVER,
      };
    }

    const completed$ = fromEvent<void>(request.raw.res, 'close').pipe(shareReplay(1), first());
    // the response's underlying connection was terminated prematurely
    const aborted$ = completed$.pipe(filter(() => !isCompleted(request)));

    return {
      aborted$,
      completed$,
    } as const;
  }

  private getRouteInfo(request: RawRequest): KibanaRequestRoute<Method> {
    const method = (request.method as Method) ?? 'get';
    const {
      parse,
      maxBytes,
      allow,
      output,
      timeout: payloadTimeout,
    } = request.route?.settings?.payload || {};

    // the socket is undefined when using @hapi/shot, or when a "fake request" is used
    let socketTimeout: undefined | number;
    let routePath: undefined | string;

    if (isRealRawRequest(request)) {
      socketTimeout = request.raw.req.socket?.timeout;
      routePath = request.route.path;
    }

    const options = {
      ...omitBy({ excludeFromRateLimiter: this.isExcludedFromRateLimiter(request) }, isNil),
      authRequired: this.getAuthRequired(request),
      // TypeScript note: Casting to `RouterOptions` to fix the following error:
      //
      //     Property 'app' does not exist on type 'RouteSettings'
      //
      // In @types/hapi__hapi v18, `request.route.settings` is of type
      // `RouteSettings`, which doesn't have an `app` property. I think this is
      // a mistake. In v19, the `RouteSettings` interface does have an `app`
      // property.
      xsrfRequired:
        ((request.route?.settings as RouteOptions)?.app as KibanaRouteOptions)?.xsrfRequired ??
        true, // some places in LP call KibanaRequest.from(request) manually. remove fallback to true before v8
      deprecated: ((request.route?.settings as RouteOptions)?.app as KibanaRouteOptions)
        ?.deprecated,
      access: this.getAccess(request),
      tags: request.route?.settings?.tags || [],
      security: this.getSecurity(request),
      timeout: {
        payload: payloadTimeout,
        idleSocket: socketTimeout === 0 ? undefined : socketTimeout,
      },
      body: isSafeMethod(method)
        ? undefined
        : {
            parse,
            maxBytes,
            accepts: allow,
            output: output as (typeof validBodyOutput)[number], // We do not support all the HAPI-supported outputs and TS complains
          },
    } as unknown as KibanaRequestRouteOptions<Method>; // TS does not understand this is OK so I'm enforced to do this enforced casting

    return {
      path: request.path ?? '/',
      routePath,
      method,
      options,
    };
  }

  private getSecurity(request: RawRequest): RouteSecurity | undefined {
    const securityConfig = ((request.route?.settings as RouteOptions)?.app as KibanaRouteOptions)
      ?.security;

    return isRouteSecurityGetter(securityConfig) ? securityConfig(request) : securityConfig;
  }

  /** set route access to internal if not declared */
  private getAccess(request: RawRequest): 'internal' | 'public' {
    return (
      ((request.route?.settings as RouteOptions)?.app as KibanaRouteOptions)?.access ?? 'internal'
    );
  }

  private getAuthRequired(request: RawRequest): boolean | 'optional' {
    if (isFakeRawRequest(request)) {
      return true;
    }

    const authOptions = request.route.settings.auth;
    if (typeof authOptions === 'object') {
      // 'try' is used in the legacy platform
      if (authOptions.mode === 'optional' || authOptions.mode === 'try') {
        return 'optional';
      }
      if (authOptions.mode === 'required') {
        return true;
      }
    }

    // legacy platform routes
    if (authOptions === undefined) {
      return true;
    }

    // @ts-expect-error According to @types/hapi__hapi, `route.settings` should be of type `RouteSettings`, but it seems that it's actually `RouteOptions` (https://github.com/hapijs/hapi/blob/v18.4.2/lib/route.js#L139)
    if (authOptions === false) {
      return false;
    }
    throw new Error(
      `unexpected authentication options: ${JSON.stringify(authOptions)} for route: ${
        this.url.pathname
      }${this.url.search}`
    );
  }

  private isExcludedFromRateLimiter(request: RawRequest): boolean | undefined {
    return ((request.route?.settings as RouteOptions)?.app as KibanaRouteOptions)
      ?.excludeFromRateLimiter;
  }
}

/**
 * Returns underlying Hapi Request
 * @internal
 */
export const ensureRawRequest = (request: KibanaRequest | Request) =>
  isKibanaRequest(request) ? request[requestSymbol] : (request as Request);

/**
 * Checks if an incoming request is a {@link KibanaRequest}
 * @internal
 */
export function isKibanaRequest(request: unknown): request is CoreKibanaRequest {
  return request instanceof CoreKibanaRequest;
}

function isRealRawRequest(request: any): request is Request {
  try {
    return (
      request.raw.req &&
      typeof request.raw.req === 'object' &&
      request.raw.res &&
      typeof request.raw.res === 'object'
    );
  } catch {
    return false;
  }
}

function isFakeRawRequest(request: RawRequest): request is FakeRawRequest {
  return !isRealRawRequest(request);
}

/**
 * Checks if an incoming request either KibanaRequest or Hapi.Request
 * @internal
 */
export function isRealRequest(request: unknown): request is KibanaRequest | Request {
  return (isKibanaRequest(request) && !request.isFakeRequest) || isRealRawRequest(request);
}

function isCompleted(request: Request) {
  return request.raw.res.writableFinished;
}

/**
 * We have certain values that may be passed via query params that we want to
 * exclude from further processing like validation. This method removes those
 * internal values.
 */
function sanitizeRequest(req: Request): { query: unknown; params: unknown; body: unknown } {
  const { [ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM]: __, ...query } = req.query ?? {};

  return {
    query,
    params: req.params,
    body: req.payload,
  };
}

function getProtocolFromHttpVersion(httpVersion: string): HttpProtocol {
  return httpVersion.split('.')[0] === '2' ? 'http2' : 'http1';
}

function getHttpVersionFromRequest(request: Request) {
  return request.raw.req.httpVersion;
}

export function getProtocolFromRequest(request: Request) {
  return getProtocolFromHttpVersion(getHttpVersionFromRequest(request));
}
