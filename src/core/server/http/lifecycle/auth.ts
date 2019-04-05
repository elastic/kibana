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
import { ScopedSessionStorage, SessionStorage } from '../session_storage';

enum ResultType {
  authenticated = 'authenticated',
  redirected = 'redirected',
  rejected = 'rejected',
}

class AuthResult {
  public static authenticated(credentials: any = {}) {
    return new AuthResult(ResultType.authenticated, credentials);
  }
  public static redirected(url: string) {
    return new AuthResult(ResultType.redirected, url);
  }
  public static rejected(error: Error) {
    return new AuthResult(ResultType.rejected, error);
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

const toolkit = {
  authenticated: AuthResult.authenticated,
  redirected: AuthResult.redirected,
  rejected: AuthResult.rejected,
};

export type Authenticate<T> = (
  request: Request,
  sessionStorage: ScopedSessionStorage<T>,
  t: typeof toolkit
) => Promise<AuthResult>;

export function adoptToHapiAuthFormat<T>(fn: Authenticate<T>, sessionStorage: SessionStorage<T>) {
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
          const { statusCode } = result.payload;
          return Boom.boomify(result.payload, { statusCode });
        }
      }
      throw new Error(
        `Unexpected result from Authenticate. Expected AuthResult, but given: ${result}`
      );
    } catch (error) {
      return new Boom(error.message, { statusCode: 500 });
    }
  };
}
