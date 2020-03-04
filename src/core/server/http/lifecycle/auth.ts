/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Lifecycle, Request, ResponseToolkit } from 'hapi';
import { Logger } from '../../logging';
import {
  HapiResponseAdapter,
  KibanaRequest,
  IKibanaResponse,
  lifecycleResponseFactory,
  LifecycleResponseFactory,
  isKibanaResponse,
} from '../router';

/** @public */
export enum AuthResultType {
  authenticated = 'authenticated',
  notHandled = 'notHandled',
}

/** @public */
export interface Authenticated extends AuthResultParams {
  type: AuthResultType.authenticated;
}

/** @public */
export interface AuthNotHandled extends AuthNotHandledResultParams {
  type: AuthResultType.notHandled;
}

/** @public */
export type AuthResult = Authenticated | AuthNotHandled;

const authResult = {
  authenticated(data: AuthResultParams = {}): AuthResult {
    return {
      type: AuthResultType.authenticated,
      state: data.state,
      requestHeaders: data.requestHeaders,
      responseHeaders: data.responseHeaders,
    };
  },
  notHandled(data: AuthNotHandledResultParams = {}): AuthResult {
    return {
      type: AuthResultType.notHandled,
      responseHeaders: data.responseHeaders,
    };
  },
  isAuthenticated(result: AuthResult): result is Authenticated {
    return Boolean(result?.type === AuthResultType.authenticated);
  },
  isNotHandled(result: AuthResult): result is AuthNotHandled {
    return Boolean(result?.type === AuthResultType.notHandled);
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
 * Result of unhandled authentication.
 * @public
 */
export interface AuthNotHandledResultParams {
  /**
   * Auth specific headers to attach to a response object.
   * Used to send back authentication mechanism related headers to a client when needed.
   */
  responseHeaders?: AuthHeaders;
}

/**
 * @public
 * A tool set defining an outcome of Auth interceptor for incoming request.
 */
export interface AuthToolkit {
  /** Authentication is successful with given credentials, allow request to pass through */
  authenticated: (data?: AuthResultParams) => AuthResult;
  /** User has no credentials */
  notHandled: (data?: AuthNotHandledResultParams) => AuthResult;
}

const toolkit: AuthToolkit = {
  authenticated: authResult.authenticated,
  notHandled: authResult.notHandled,
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
  onAuth: (request: Request, data: AuthResultParams) => void = () => undefined,
  onNotHandled: (request: Request, data: AuthNotHandledResultParams) => void = () => undefined
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

      if (authResult.isNotHandled(result)) {
        if (kibanaRequest.route.options.authRequired === 'optional') {
          return responseToolkit.continue;
        }
        if (kibanaRequest.route.options.authRequired) {
          onNotHandled(request, {
            responseHeaders: result.responseHeaders,
          });
          return hapiResponseAdapter.handle(lifecycleResponseFactory.unauthorized());
        }
        throw new Error(
          `Unexpected route.options.authRequired value in AuthenticationHandler. Expected 'optional' or true, but given: ${result}.`
        );
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
