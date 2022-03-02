/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL } from 'url';
import uuid from 'uuid';
import { Request, RouteOptionsApp, RequestApplicationState, RouteOptions } from '@hapi/hapi';
import { Observable, fromEvent } from 'rxjs';
import { shareReplay, first, filter } from 'rxjs/operators';
import { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';

import { Headers } from './headers';
import { RouteMethod, RouteConfigOptions, validBodyOutput, isSafeMethod } from './route';
import { KibanaSocket, IKibanaSocket } from './socket';
import { RouteValidator, RouteValidatorFullConfig } from './validator';

const requestSymbol = Symbol('request');

/**
 * @internal
 */
export interface KibanaRouteOptions extends RouteOptionsApp {
  xsrfRequired: boolean;
}

/**
 * @internal
 */
export interface KibanaRequestState extends RequestApplicationState {
  requestId: string;
  requestUuid: string;
  rewrittenUrl?: URL;
  traceId?: string;
}

/**
 * Route options: If 'GET' or 'OPTIONS' method, body options won't be returned.
 * @public
 */
export type KibanaRequestRouteOptions<Method extends RouteMethod> = Method extends 'get' | 'options'
  ? Required<Omit<RouteConfigOptions<Method>, 'body'>>
  : Required<RouteConfigOptions<Method>>;

/**
 * Request specific route information exposed to a handler.
 * @public
 * */
export interface KibanaRequestRoute<Method extends RouteMethod> {
  path: string;
  method: Method;
  options: KibanaRequestRouteOptions<Method>;
}

/**
 * Request events.
 * @public
 * */
export interface KibanaRequestEvents {
  /**
   * Observable that emits once if and when the request has been aborted.
   */
  aborted$: Observable<void>;

  /**
   * Observable that emits once if and when the request has been completely handled.
   *
   * @remarks
   * The request may be considered completed if:
   * - A response has been sent to the client; or
   * - The request was aborted.
   */
  completed$: Observable<void>;
}

/**
 * Kibana specific abstraction for an incoming request.
 * @public
 */
export class KibanaRequest<
  Params = unknown,
  Query = unknown,
  Body = unknown,
  Method extends RouteMethod = any
> {
  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   * @internal
   */
  public static from<P, Q, B>(
    req: Request,
    routeSchemas: RouteValidator<P, Q, B> | RouteValidatorFullConfig<P, Q, B> = {},
    withoutSecretHeaders: boolean = true
  ) {
    const routeValidator = RouteValidator.from<P, Q, B>(routeSchemas);
    const requestParts = KibanaRequest.validate(req, routeValidator);
    return new KibanaRequest(
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
    req: Request,
    routeValidator: RouteValidator<P, Q, B>
  ): {
    params: P;
    query: Q;
    body: B;
  } {
    const params = routeValidator.getParams(req.params, 'request params');
    const query = routeValidator.getQuery(req.query, 'request query');
    const body = routeValidator.getBody(req.payload, 'request body');
    return { query, params, body };
  }

  /**
   * A identifier to identify this request.
   *
   * @remarks
   * Depending on the user's configuration, this value may be sourced from the
   * incoming request's `X-Opaque-Id` header which is not guaranteed to be unique
   * per request.
   */
  public readonly id: string;
  /**
   * A UUID to identify this request.
   *
   * @remarks
   * This value is NOT sourced from the incoming request's `X-Opaque-Id` header. it
   * is always a UUID uniquely identifying the request.
   */
  public readonly uuid: string;
  /** a WHATWG URL standard object. */
  public readonly url: URL;
  /** matched route details */
  public readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
  /**
   * Readonly copy of incoming request headers.
   * @remarks
   * This property will contain a `filtered` copy of request headers.
   */
  public readonly headers: Headers;
  /**
   * Whether or not the request is a "system request" rather than an application-level request.
   * Can be set on the client using the `HttpFetchOptions#asSystemRequest` option.
   */
  public readonly isSystemRequest: boolean;

  /** {@link IKibanaSocket} */
  public readonly socket: IKibanaSocket;
  /** Request events {@link KibanaRequestEvents} */
  public readonly events: KibanaRequestEvents;
  public readonly auth: {
    /* true if the request has been successfully authenticated, otherwise false. */
    isAuthenticated: boolean;
  };

  /**
   * URL rewritten in onPreRouting request interceptor.
   */
  public readonly rewrittenUrl?: URL;

  /** @internal */
  protected readonly [requestSymbol]: Request;

  constructor(
    request: Request,
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
    this.id = appState?.requestId ?? uuid.v4();
    this.uuid = appState?.requestUuid ?? uuid.v4();
    this.rewrittenUrl = appState?.rewrittenUrl;

    this.url = request.url;
    this.headers = deepFreeze({ ...request.headers });
    this.isSystemRequest = request.headers['kbn-system-request'] === 'true';

    // prevent Symbol exposure via Object.getOwnPropertySymbols()
    Object.defineProperty(this, requestSymbol, {
      value: request,
      enumerable: false,
    });

    this.route = deepFreeze(this.getRouteInfo(request));
    this.socket = new KibanaSocket(request.raw.req.socket);
    this.events = this.getEvents(request);

    this.auth = {
      // missing in fakeRequests, so we cast to false
      isAuthenticated: Boolean(request.auth?.isAuthenticated),
    };
  }

  private getEvents(request: Request): KibanaRequestEvents {
    const completed$ = fromEvent<void>(request.raw.res, 'close').pipe(shareReplay(1), first());
    // the response's underlying connection was terminated prematurely
    const aborted$ = completed$.pipe(filter(() => !isCompleted(request)));

    return {
      aborted$,
      completed$,
    } as const;
  }

  private getRouteInfo(request: Request): KibanaRequestRoute<Method> {
    const method = request.method as Method;
    const {
      parse,
      maxBytes,
      allow,
      output,
      timeout: payloadTimeout,
    } = request.route.settings.payload || {};

    // net.Socket#timeout isn't documented, yet, and isn't part of the types... https://github.com/nodejs/node/pull/34543
    // the socket is also undefined when using @hapi/shot, or when a "fake request" is used
    const socketTimeout = (request.raw.req.socket as any)?.timeout;
    const options = {
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
        ((request.route.settings as RouteOptions).app as KibanaRouteOptions)?.xsrfRequired ?? true, // some places in LP call KibanaRequest.from(request) manually. remove fallback to true before v8
      tags: request.route.settings.tags || [],
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
            output: output as typeof validBodyOutput[number], // We do not support all the HAPI-supported outputs and TS complains
          },
    } as unknown as KibanaRequestRouteOptions<Method>; // TS does not understand this is OK so I'm enforced to do this enforced casting

    return {
      path: request.path,
      method,
      options,
    };
  }

  private getAuthRequired(request: Request): boolean | 'optional' {
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
    if (authOptions === false) return false;
    throw new Error(
      `unexpected authentication options: ${JSON.stringify(authOptions)} for route: ${
        this.url.pathname
      }${this.url.search}`
    );
  }
}

/**
 * Returns underlying Hapi Request
 * @internal
 */
export const ensureRawRequest = (request: KibanaRequest | Request) =>
  isKibanaRequest(request) ? request[requestSymbol] : request;

/**
 * Checks if an incoming request is a {@link KibanaRequest}
 * @internal
 */
export function isKibanaRequest(request: unknown): request is KibanaRequest {
  return request instanceof KibanaRequest;
}

function isRequest(request: any): request is Request {
  try {
    return request.raw.req && typeof request.raw.req === 'object';
  } catch {
    return false;
  }
}

/**
 * Checks if an incoming request either KibanaRequest or Hapi.Request
 * @internal
 */
export function isRealRequest(request: unknown): request is KibanaRequest | Request {
  return isKibanaRequest(request) || isRequest(request);
}

function isCompleted(request: Request) {
  return request.raw.res.writableFinished;
}
