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
export interface HttpSelfCredentialRefresherOptions {
  /** The request the self client was scoped to. */
  request: KibanaRequest;
  /** Kibana-relative path of the self call about to be sent. */
  path: string;
  /**
   * How long the call may run before the self client gives up on it, in milliseconds. A credential
   * that expires sooner can be rejected by the target route handler while it is still running.
   */
  timeoutMs: number;
}

/**
 * @public
 */
export interface HttpSelfCredentialRefresherReplaceParams {
  authHeaders: AuthHeaders;
}

/**
 * @public
 */
export interface HttpSelfCredentialRefresherReplaceResult
  extends HttpSelfCredentialRefresherReplaceParams {
  type: 'replace';
}

/**
 * @public
 */
export interface HttpSelfCredentialRefresherRejectParams {
  /**
   * The error the self call fails with. Its message reaches whoever made the call, so it must not
   * carry upstream detail, such as an identity provider's response body.
   */
  error: Error;
}

/**
 * @public
 */
export interface HttpSelfCredentialRefresherRejectResult
  extends HttpSelfCredentialRefresherRejectParams {
  type: 'reject';
}

/**
 * @public
 */
export interface HttpSelfCredentialRefresherNotHandledResult {
  type: 'notHandled';
}

/**
 * @public
 */
export type HttpSelfCredentialRefresherResult =
  | HttpSelfCredentialRefresherReplaceResult
  | HttpSelfCredentialRefresherRejectResult
  | HttpSelfCredentialRefresherNotHandledResult;

/**
 * Toolkit passed to a {@link HttpSelfCredentialRefresher} used to generate its result.
 *
 * @public
 */
export interface HttpSelfCredentialRefresherToolkit {
  /** The call is sent with the credential derived from the request. */
  notHandled: () => HttpSelfCredentialRefresherNotHandledResult;
  /** The call is sent with these headers overriding the ones derived from the request. */
  replace: (
    params: HttpSelfCredentialRefresherReplaceParams
  ) => HttpSelfCredentialRefresherReplaceResult;
  /**
   * The call is not sent and fails with this error, because the credential cannot cover it and
   * never will. Reserved for a definitive refusal: a refresher that is unsure lets the call go.
   */
  reject: (
    params: HttpSelfCredentialRefresherRejectParams
  ) => HttpSelfCredentialRefresherRejectResult;
}

/**
 * A function consulted before every Kibana self HTTP call, giving the owner of a short-lived
 * credential a chance to replace it before the target route handler starts using it.
 *
 * The self client can only recover a 401 raised by the authentication lifecycle. Once the target
 * route handler runs, it holds the credential it was called with, and nothing can replace it for
 * the rest of the call.
 *
 * A refresher that throws is treated as broken, not as a refusal: the self client logs a warning
 * and sends the call unchanged. Only {@link HttpSelfCredentialRefresherToolkit.reject} fails it.
 *
 * Like the {@link HttpSelfUnauthorizedErrorHandler}, replacement headers apply to this call only
 * and are never written to the request's {@link IAuthHeadersStorage} entry.
 *
 * @public
 */
export type HttpSelfCredentialRefresher = (
  options: HttpSelfCredentialRefresherOptions,
  toolkit: HttpSelfCredentialRefresherToolkit
) => MaybePromise<HttpSelfCredentialRefresherResult>;
