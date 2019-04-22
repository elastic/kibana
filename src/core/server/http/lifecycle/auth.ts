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
import Boom from 'boom';
import { Lifecycle, Request, ResponseToolkit } from 'hapi';
import { SessionStorage, SessionStorageFactory } from '../session_storage';

enum ResultType {
  authenticated = 'authenticated',
  redirected = 'redirected',
  rejected = 'rejected',
}

/** @internal */
class AuthResult {
  public static authenticated(credentials: any) {
    return new AuthResult(ResultType.authenticated, credentials);
  }
  public static redirected(url: string) {
    return new AuthResult(ResultType.redirected, url);
  }
  public static rejected(error: Error, options: { statusCode?: number } = {}) {
    return new AuthResult(ResultType.rejected, { error, statusCode: options.statusCode });
  }
  public static isValidResult(candidate: any) {
    return candidate instanceof AuthResult;
  }
  constructor(private readonly type: ResultType, public readonly payload: any) {}
  public isAuthenticated() {
    return this.type === ResultType.authenticated;
  }
  public isRedirected() {
    return this.type === ResultType.redirected;
  }
  public isRejected() {
    return this.type === ResultType.rejected;
  }
}

/**
 * @public
 * A tool set defining an outcome of Auth interceptor for incoming request.
 */
export interface AuthToolkit {
  /** Authentication is successful with given credentials, allow request to pass through */
  authenticated: (credentials: any) => AuthResult;
  /** Authentication requires to interrupt request handling and redirect to a configured url */
  redirected: (url: string) => AuthResult;
  /** Authentication is unsuccessful, fail the request with specified error. */
  rejected: (error: Error, options?: { statusCode?: number }) => AuthResult;
}

const toolkit: AuthToolkit = {
  authenticated: AuthResult.authenticated,
  redirected: AuthResult.redirected,
  rejected: AuthResult.rejected,
};

/** @public */
export type AuthenticationHandler<T> = (
  request: Request,
  sessionStorage: SessionStorage<T>,
  t: AuthToolkit
) => Promise<AuthResult>;

/** @public */
export function adoptToHapiAuthFormat<T = any>(
  fn: AuthenticationHandler<T>,
  sessionStorage: SessionStorageFactory<T>
) {
  return async function interceptAuth(
    req: Request,
    h: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    try {
      const result = await fn(req, sessionStorage.asScoped(req), toolkit);

      if (AuthResult.isValidResult(result)) {
        if (result.isAuthenticated()) {
          return h.authenticated({ credentials: result.payload });
        }
        if (result.isRedirected()) {
          return h.redirect(result.payload).takeover();
        }
        if (result.isRejected()) {
          const { error, statusCode } = result.payload;
          return Boom.boomify(error, { statusCode });
        }
      }
      throw new Error(
        `Unexpected result from Authenticate. Expected AuthResult, but given: ${result}.`
      );
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
