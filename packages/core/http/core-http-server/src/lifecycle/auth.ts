/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ResponseHeaders,
  IKibanaResponse,
  KibanaRequest,
  LifecycleResponseFactory,
} from '../router';

/** @public */
export enum AuthResultType {
  authenticated = 'authenticated',
  notHandled = 'notHandled',
  redirected = 'redirected',
}

/** @public */
export interface AuthResultAuthenticated extends AuthResultParams {
  type: AuthResultType.authenticated;
}

/** @public */
export interface AuthResultNotHandled {
  type: AuthResultType.notHandled;
}

/** @public */
export interface AuthResultRedirected extends AuthRedirectedParams {
  type: AuthResultType.redirected;
}

/** @public */
export type AuthResult = AuthResultAuthenticated | AuthResultNotHandled | AuthResultRedirected;

/** @public */
export type AuthHeaders = Record<string, string | string[]>;

/**
 * Result of successful authentication.
 * @public
 */
export interface AuthResultParams {
  /**
   * Data to associate with an incoming request. Any downstream plugin may get access to the data.
   */
  state?: Record<string, any>;
  /**
   * Auth specific headers to attach to a request object.
   * Used to perform a request to Elasticsearch on behalf of an authenticated user.
   */
  requestHeaders?: AuthHeaders;
  /**
   * Auth specific headers to attach to a response object.
   * Used to send back authentication mechanism related headers to a client when needed.
   */
  responseHeaders?: AuthHeaders;
}

/**
 * Result of auth redirection.
 * @public
 */
export interface AuthRedirectedParams {
  /**
   * Headers to attach for auth redirect.
   * Must include "location" header
   */
  headers: { location: string } & ResponseHeaders;
}

/**
 * @public
 * A tool set defining an outcome of Auth interceptor for incoming request.
 */
export interface AuthToolkit {
  /** Authentication is successful with given credentials, allow request to pass through */
  authenticated: (data?: AuthResultParams) => AuthResult;
  /**
   * User has no credentials.
   * Allows user to access a resource when authRequired is 'optional'
   * Rejects a request when authRequired: true
   * */
  notHandled: () => AuthResult;
  /**
   * Redirects user to another location to complete authentication when authRequired: true
   * Allows user to access a resource without redirection when authRequired: 'optional'
   * */
  redirected: (headers: { location: string } & ResponseHeaders) => AuthResult;
}

/**
 * See {@link AuthToolkit}.
 * @public
 */
export type AuthenticationHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: AuthToolkit
) => AuthResult | IKibanaResponse | Promise<AuthResult | IKibanaResponse>;
