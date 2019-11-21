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
}

/** @public */
export interface Authenticated extends AuthResultParams {
  type: AuthResultType.authenticated;
}

/** @public */
export type AuthResult = Authenticated;

const authResult = {
  authenticated(data: Partial<AuthResultParams> = {}): AuthResult {
    return {
      type: AuthResultType.authenticated,
      state: data.state,
      requestHeaders: data.requestHeaders,
      responseHeaders: data.responseHeaders,
    };
  },
  isAuthenticated(result: AuthResult): result is Authenticated {
    return result && result.type === AuthResultType.authenticated;
  },
};

/**
 * Auth Headers map
 * @public
 */

export type AuthHeaders = Record<string, string | string[]>;

/**
 * Result of an incoming request authentication.
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
 * @public
 * A tool set defining an outcome of Auth interceptor for incoming request.
 */
export interface AuthToolkit {
  /** Authentication is successful with given credentials, allow request to pass through */
  authenticated: (data?: AuthResultParams) => AuthResult;
}

const toolkit: AuthToolkit = {
  authenticated: authResult.authenticated,
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
  onSuccess: (req: Request, data: AuthResultParams) => void = () => undefined
) {
  return async function interceptAuth(
    request: Request,
    responseToolkit: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    try {
      const result = await fn(
        KibanaRequest.from(request, undefined, false),
        lifecycleResponseFactory,
        toolkit
      );
      if (isKibanaResponse(result)) {
        return hapiResponseAdapter.handle(result);
      }
      if (authResult.isAuthenticated(result)) {
        onSuccess(request, {
          state: result.state,
          requestHeaders: result.requestHeaders,
          responseHeaders: result.responseHeaders,
        });
        return responseToolkit.authenticated({ credentials: result.state || {} });
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
