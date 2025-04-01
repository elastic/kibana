/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { URL } from 'url';
import type { RequestApplicationState, RouteOptionsApp } from '@hapi/hapi';
import type { Observable } from 'rxjs';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { HttpProtocol } from '../http_contract';
import type { IKibanaSocket } from './socket';
import type { RouteMethod, RouteConfigOptions, RouteSecurity, RouteDeprecationInfo } from './route';
import type { Headers } from './headers';

export type RouteSecurityGetter = (request?: {
  headers: KibanaRequest['headers'];
  query?: KibanaRequest['query'];
}) => RouteSecurity | undefined;
export type InternalRouteSecurity = RouteSecurity | RouteSecurityGetter;

/**
 * @public
 */
export interface KibanaRouteOptions extends RouteOptionsApp {
  deprecated?: RouteDeprecationInfo;
  xsrfRequired: boolean;
  access: 'internal' | 'public';
  security?: InternalRouteSecurity;
  excludeFromRateLimiter?: boolean;
}

/**
 * @public
 */
export interface KibanaRequestState extends RequestApplicationState {
  requestId: string;
  requestUuid: string;
  rewrittenUrl?: URL;
  traceId?: string;
  authzResult?: Record<string, boolean>;
  measureElu?: () => void;
}

/**
 * Route options: If 'GET' or 'OPTIONS' method, body options won't be returned.
 * @public
 */
export type KibanaRequestRouteOptions<Method extends RouteMethod> = (Method extends
  | 'get'
  | 'options'
  ? Required<Omit<RouteConfigOptions<Method>, 'body'>>
  : Required<RouteConfigOptions<Method>>) & { security?: RouteSecurity };

/**
 * Request specific route information exposed to a handler.
 * @public
 * */
export interface KibanaRequestRoute<Method extends RouteMethod> {
  path: string;
  method: Method;
  options: KibanaRequestRouteOptions<Method>;
  routePath?: string;
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
 * Auth status for this request.
 * @public
 */
export interface KibanaRequestAuth {
  /** true if the request has been successfully authenticated, false otherwise. */
  isAuthenticated: boolean;
}

/**
 * Kibana specific abstraction for an incoming request.
 * @public
 */
export interface KibanaRequest<
  Params = unknown,
  Query = unknown,
  Body = unknown,
  Method extends RouteMethod = any
> {
  /**
   * A identifier to identify this request.
   *
   * @remarks
   * Depending on the user's configuration, this value may be sourced from the
   * incoming request's `X-Opaque-Id` header which is not guaranteed to be unique
   * per request.
   */
  readonly id: string;

  /**
   * A UUID to identify this request.
   *
   * @remarks
   * This value is NOT sourced from the incoming request's `X-Opaque-Id` header. it
   * is always a UUID uniquely identifying the request.
   */
  readonly uuid: string;

  /** a WHATWG URL standard object. */
  readonly url: URL;

  /** matched route details */
  readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;

  /**
   * Readonly copy of incoming request headers.
   * @remarks
   * This property will contain a `filtered` copy of request headers.
   */
  readonly headers: Headers;

  /**
   * Whether or not the request is a "system request" rather than an application-level request.
   * Can be set on the client using the `HttpFetchOptions#asSystemRequest` option.
   */
  readonly isSystemRequest: boolean;

  /**
   * Allows identifying requests that were created using a {@link FakeRawRequest}
   * Even if the API facade is the same, fake requests have some stubbed functionalities.
   */
  readonly isFakeRequest: boolean;

  /**
   * Authorization check result, passed to the route handler.
   * Indicates whether the specific privilege was granted or denied.
   */
  readonly authzResult?: Record<string, boolean>;

  /**
   * An internal request has access to internal routes.
   * @note See the {@link KibanaRequestRouteOptions#access} route option.
   */
  readonly isInternalApiRequest: boolean;

  /**
   * The HTTP version sent by the client.
   */
  readonly httpVersion: string;

  /**
   * The protocol used by the client, inferred from the httpVersion.
   */
  readonly protocol: HttpProtocol;

  /**
   * The socket associated with this request.
   * See {@link IKibanaSocket}.
   */
  readonly socket: IKibanaSocket;

  /**
   * Allow to listen to events bound to this request.
   * See {@link KibanaRequestEvents}.
   */
  readonly events: KibanaRequestEvents;

  /**
   * The auth status of this request.
   * See {@link KibanaRequestAuth}.
   */
  readonly auth: KibanaRequestAuth;

  /**
   * URL rewritten in onPreRouting request interceptor.
   */
  readonly rewrittenUrl?: URL;

  /**
   * The versioned route API version of this request.
   */
  readonly apiVersion: string | undefined;

  /**
   * The path parameter of this request.
   */
  readonly params: Params;

  /**
   * The query parameter of this request.
   */
  readonly query: Query;

  /**
   * The body payload of this request.
   */
  readonly body: Body;
}

/**
 * @remark Convenience type, use when the concrete values of P, Q, B and route method do not matter.
 */
export type AnyKibanaRequest = KibanaRequest<unknown, unknown, unknown, RouteMethod>;
