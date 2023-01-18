/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL } from 'url';
import { v4 as uuid } from 'uuid';
import type { Request, RouteOptions } from '@hapi/hapi';
import { fromEvent, NEVER } from 'rxjs';
import { shareReplay, first, filter } from 'rxjs/operators';
import { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';
import {
  KibanaRequest,
  Headers,
  RouteMethod,
  validBodyOutput,
  IKibanaSocket,
  RouteValidatorFullConfig,
  KibanaRequestRoute,
  KibanaRequestEvents,
  KibanaRequestAuth,
  KibanaRequestState,
  KibanaRouteOptions,
  KibanaRequestRouteOptions,
  RawRequest,
  FakeRawRequest,
} from '@kbn/core-http-server';
import { isSafeMethod } from './route';
import { KibanaSocket } from './socket';
import { RouteValidator } from './validator';

const requestSymbol = Symbol('request');

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
    routeSchemas: RouteValidator<P, Q, B> | RouteValidatorFullConfig<P, Q, B> = {},
    withoutSecretHeaders: boolean = true
  ) {
    const routeValidator = RouteValidator.from<P, Q, B>(routeSchemas);
    const requestParts = CoreKibanaRequest.validate(req, routeValidator);
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
    req: RawRequest,
    routeValidator: RouteValidator<P, Q, B>
  ): {
    params: P;
    query: Q;
    body: B;
  } {
    if (isFakeRawRequest(req)) {
      return { query: {} as Q, params: {} as P, body: {} as B };
    }
    const params = routeValidator.getParams(req.params, 'request params');
    const query = routeValidator.getQuery(req.query, 'request query');
    const body = routeValidator.getBody(req.payload, 'request body');
    return { query, params, body };
  }

  /** {@inheritDoc IKibanaRequest.id} */
  public readonly id: string;
  /** {@inheritDoc IKibanaRequest.uuid} */
  public readonly uuid: string;
  /** {@inheritDoc IKibanaRequest.url} */
  public readonly url: URL;
  /** {@inheritDoc IKibanaRequest.route} */
  public readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
  /** {@inheritDoc IKibanaRequest.headers} */
  public readonly headers: Headers;
  /** {@inheritDoc IKibanaRequest.isSystemRequest} */
  public readonly isSystemRequest: boolean;
  /** {@inheritDoc IKibanaRequest.socket} */
  public readonly socket: IKibanaSocket;
  /** {@inheritDoc IKibanaRequest.events} */
  public readonly events: KibanaRequestEvents;
  /** {@inheritDoc IKibanaRequest.auth} */
  public readonly auth: KibanaRequestAuth;
  /** {@inheritDoc IKibanaRequest.isFakeRequest} */
  public readonly isFakeRequest: boolean;
  /** {@inheritDoc IKibanaRequest.rewrittenUrl} */
  public readonly rewrittenUrl?: URL;

  /** @internal */
  protected readonly [requestSymbol]: Request;

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
    this.id = appState?.requestId ?? uuid.v4();
    this.uuid = appState?.requestUuid ?? uuid.v4();
    this.rewrittenUrl = appState?.rewrittenUrl;

    this.url = request.url ?? new URL('https://fake-request/url');
    this.headers = isRealRawRequest(request) ? deepFreeze({ ...request.headers }) : request.headers;
    this.isSystemRequest = this.headers['kbn-system-request'] === 'true';
    this.isFakeRequest = isFakeRawRequest(request);

    // prevent Symbol exposure via Object.getOwnPropertySymbols()
    Object.defineProperty(this, requestSymbol, {
      value: request,
      enumerable: false,
    });

    this.route = deepFreeze(this.getRouteInfo(request));
    this.socket = isRealRawRequest(request)
      ? new KibanaSocket(request.raw.req.socket)
      : KibanaSocket.getFakeSocket();
    this.events = this.getEvents(request);

    this.auth = {
      // missing in fakeRequests, so we cast to false
      isAuthenticated: request.auth?.isAuthenticated ?? false,
    };
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
    const socketTimeout = isRealRawRequest(request) ? request.raw.req.socket?.timeout : undefined;
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
        ((request.route?.settings as RouteOptions)?.app as KibanaRouteOptions)?.xsrfRequired ??
        true, // some places in LP call KibanaRequest.from(request) manually. remove fallback to true before v8
      tags: request.route?.settings?.tags || [],
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
      path: request.path ?? '/',
      method,
      options,
    };
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
  return isKibanaRequest(request) || isRealRawRequest(request);
}

function isCompleted(request: Request) {
  return request.raw.res.writableFinished;
}
