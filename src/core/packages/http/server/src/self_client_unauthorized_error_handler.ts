/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { AuthHeaders } from './lifecycle';
import type { KibanaRequest } from './router';

/**
 * @public
 */
export interface HttpSelfUnauthorizedErrorHandlerOptions {
  /** The request the self client was scoped to. */
  request: KibanaRequest;
  /** Kibana-relative path of the self call that returned 401. */
  path: string;
  /**
   * Response headers of the 401. The body is deliberately not exposed: Core owns its lifecycle,
   * and Kibana's own 401 carries no machine-readable reason to branch on.
   */
  responseHeaders: Headers;
}

/**
 * @public
 */
export interface HttpSelfUnauthorizedErrorHandlerRetryParams {
  authHeaders: AuthHeaders;
}

/**
 * @public
 */
export interface HttpSelfUnauthorizedErrorHandlerRetryResult
  extends HttpSelfUnauthorizedErrorHandlerRetryParams {
  type: 'retry';
}

/**
 * @public
 */
export interface HttpSelfUnauthorizedErrorHandlerNotHandledResult {
  type: 'notHandled';
}

/**
 * @public
 */
export type HttpSelfUnauthorizedErrorHandlerResult =
  | HttpSelfUnauthorizedErrorHandlerRetryResult
  | HttpSelfUnauthorizedErrorHandlerNotHandledResult;

/**
 * Toolkit passed to a {@link HttpSelfUnauthorizedErrorHandler} used to generate its result.
 *
 * @public
 */
export interface HttpSelfUnauthorizedErrorHandlerToolkit {
  /**
   * The handler cannot refresh this request's credential, or was not able to authenticate.
   */
  notHandled: () => HttpSelfUnauthorizedErrorHandlerNotHandledResult;
  /**
   * The handler produced a fresh credential. The self call is replayed once with these headers
   * overriding the ones it derived for the first attempt.
   */
  retry: (
    params: HttpSelfUnauthorizedErrorHandlerRetryParams
  ) => HttpSelfUnauthorizedErrorHandlerRetryResult;
}

/**
 * A handler used to recover a Kibana self HTTP call that was rejected by the authentication
 * lifecycle, typically because a short-lived credential expired mid-flight.
 *
 * Core only consults the handler for a 401 the authentication lifecycle raised, so the target
 * route handler provably did not run and replaying the call cannot duplicate a side effect.
 *
 * The returned headers apply to the retried call only: unlike the Elasticsearch client's
 * equivalent, they are never written to the request's {@link IAuthHeadersStorage} entry, because a
 * self call must not mutate the ambient authentication state of the request it is scoped to.
 *
 * @public
 */
export type HttpSelfUnauthorizedErrorHandler = (
  options: HttpSelfUnauthorizedErrorHandlerOptions,
  toolkit: HttpSelfUnauthorizedErrorHandlerToolkit
) => MaybePromise<HttpSelfUnauthorizedErrorHandlerResult>;
