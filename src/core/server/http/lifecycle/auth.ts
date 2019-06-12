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
import { noop } from 'lodash';
import { Lifecycle, Request, ResponseToolkit } from 'hapi';

enum ResultType {
  authenticated = 'authenticated',
  redirected = 'redirected',
  rejected = 'rejected',
}

interface Authenticated {
  type: ResultType.authenticated;
  state: object;
}

interface Redirected {
  type: ResultType.redirected;
  url: string;
}

interface Rejected {
  type: ResultType.rejected;
  error: Error;
  statusCode?: number;
}

type AuthResult = Authenticated | Rejected | Redirected;

const authResult = {
  authenticated(state: object = {}): AuthResult {
    return { type: ResultType.authenticated, state };
  },
  redirected(url: string): AuthResult {
    return { type: ResultType.redirected, url };
  },
  rejected(error: Error, options: { statusCode?: number } = {}): AuthResult {
    return { type: ResultType.rejected, error, statusCode: options.statusCode };
  },
  isValid(candidate: any): candidate is AuthResult {
    return (
      candidate &&
      (candidate.type === ResultType.authenticated ||
        candidate.type === ResultType.rejected ||
        candidate.type === ResultType.redirected)
    );
  },
  isAuthenticated(result: AuthResult): result is Authenticated {
    return result.type === ResultType.authenticated;
  },
  isRedirected(result: AuthResult): result is Redirected {
    return result.type === ResultType.redirected;
  },
  isRejected(result: AuthResult): result is Rejected {
    return result.type === ResultType.rejected;
  },
};

/**
 * @public
 * A tool set defining an outcome of Auth interceptor for incoming request.
 */
export interface AuthToolkit {
  /** Authentication is successful with given credentials, allow request to pass through */
  authenticated: (state?: object) => AuthResult;
  /** Authentication requires to interrupt request handling and redirect to a configured url */
  redirected: (url: string) => AuthResult;
  /** Authentication is unsuccessful, fail the request with specified error. */
  rejected: (error: Error, options?: { statusCode?: number }) => AuthResult;
}

const toolkit: AuthToolkit = {
  authenticated: authResult.authenticated,
  redirected: authResult.redirected,
  rejected: authResult.rejected,
};

/** @public */
export type AuthenticationHandler = (
  request: Readonly<Request>,
  t: AuthToolkit
) => AuthResult | Promise<AuthResult>;

/** @public */
export function adoptToHapiAuthFormat(
  fn: AuthenticationHandler,
  onSuccess: (req: Request, state: unknown) => void = noop
) {
  return async function interceptAuth(
    req: Request,
    h: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    try {
      const result = await fn(req, toolkit);
      if (!authResult.isValid(result)) {
        throw new Error(
          `Unexpected result from Authenticate. Expected AuthResult, but given: ${result}.`
        );
      }
      if (authResult.isAuthenticated(result)) {
        onSuccess(req, result.state);
        return h.authenticated({ credentials: result.state });
      }
      if (authResult.isRedirected(result)) {
        return h.redirect(result.url).takeover();
      }
      const { error, statusCode } = result;
      return Boom.boomify(error, { statusCode });
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
