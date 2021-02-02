/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import { Logger } from '../../logging';
import {
  HapiResponseAdapter,
  KibanaRequest,
  IKibanaResponse,
  lifecycleResponseFactory,
  LifecycleResponseFactory,
  isKibanaResponse,
  ResponseHeaders,
} from '../router';

/** @public */
export enum AuthResultType {
  authenticated = 'authenticated',
  notHandled = 'notHandled',
  redirected = 'redirected',
}

/** @public */
export interface Authenticated extends AuthResultParams {
  type: AuthResultType.authenticated;
}

/** @public */
export interface AuthNotHandled {
  type: AuthResultType.notHandled;
}

/** @public */
export interface AuthRedirected extends AuthRedirectedParams {
  type: AuthResultType.redirected;
}

/** @public */
export type AuthResult = Authenticated | AuthNotHandled | AuthRedirected;

const authResult = {
  authenticated(data: AuthResultParams = {}): AuthResult {
    return {
      type: AuthResultType.authenticated,
      state: data.state,
      requestHeaders: data.requestHeaders,
      responseHeaders: data.responseHeaders,
    };
  },
  notHandled(): AuthResult {
    return {
      type: AuthResultType.notHandled,
    };
  },
  redirected(headers: { location: string } & ResponseHeaders): AuthResult {
    return {
      type: AuthResultType.redirected,
      headers,
    };
  },
  isAuthenticated(result: AuthResult): result is Authenticated {
    return result?.type === AuthResultType.authenticated;
  },
  isNotHandled(result: AuthResult): result is AuthNotHandled {
    return result?.type === AuthResultType.notHandled;
  },
  isRedirected(result: AuthResult): result is AuthRedirected {
    return result?.type === AuthResultType.redirected;
  },
};

/**
 * Auth Headers map
 * @public
 */

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
   * Allows user to access a resource when authRequired: 'optional'
   * Rejects a request when authRequired: true
   * */
  notHandled: () => AuthResult;
  /**
   * Redirects user to another location to complete authentication when authRequired: true
   * Allows user to access a resource without redirection when authRequired: 'optional'
   * */
  redirected: (headers: { location: string } & ResponseHeaders) => AuthResult;
}

const toolkit: AuthToolkit = {
  authenticated: authResult.authenticated,
  notHandled: authResult.notHandled,
  redirected: authResult.redirected,
};

/**
 * See {@link AuthToolkit}.
 * @public
 */
export type AuthenticationHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: AuthToolkit
) => AuthResult | IKibanaResponse | Promise<AuthResult | IKibanaResponse>;

/** @public */
export function adoptToHapiAuthFormat(
  fn: AuthenticationHandler,
  log: Logger,
  onAuth: (request: Request, data: AuthResultParams) => void = () => undefined
) {
  return async function interceptAuth(
    request: Request,
    responseToolkit: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    const kibanaRequest = KibanaRequest.from(request, undefined, false);

    try {
      const result = await fn(kibanaRequest, lifecycleResponseFactory, toolkit);

      if (isKibanaResponse(result)) {
        return hapiResponseAdapter.handle(result);
      }

      if (authResult.isAuthenticated(result)) {
        onAuth(request, {
          state: result.state,
          requestHeaders: result.requestHeaders,
          responseHeaders: result.responseHeaders,
        });
        return responseToolkit.authenticated({ credentials: result.state || {} });
      }

      if (authResult.isRedirected(result)) {
        // we cannot redirect a user when resources with optional auth requested
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return responseToolkit.continue;
        }

        return hapiResponseAdapter.handle(
          lifecycleResponseFactory.redirected({
            // hapi doesn't accept string[] as a valid header
            headers: result.headers as any,
          })
        );
      }

      if (authResult.isNotHandled(result)) {
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return responseToolkit.continue;
        }
        return hapiResponseAdapter.handle(lifecycleResponseFactory.unauthorized());
      }
      throw new Error(
        `Unexpected result from Authenticate. Expected AuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return hapiResponseAdapter.toInternalError();
    }
  };
}
