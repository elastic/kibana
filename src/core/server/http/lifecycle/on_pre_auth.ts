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
import { KibanaRequest } from '../router';

enum ResultType {
  next = 'next',
  redirected = 'redirected',
  rejected = 'rejected',
}

interface NextParams {
  type: ResultType.next;
}

interface RedirectedParams {
  type: ResultType.redirected;
  url: string;
  forward?: boolean;
}

interface RejectedParams {
  type: ResultType.rejected;
  error: Error;
  statusCode?: number;
}

/** @internal */
class OnPreAuthResult {
  public static next() {
    return new OnPreAuthResult({ type: ResultType.next });
  }
  public static redirected(url: string, options: { forward?: boolean } = {}) {
    return new OnPreAuthResult({ type: ResultType.redirected, url, forward: options.forward });
  }
  public static rejected(error: Error, options: { statusCode?: number } = {}) {
    return new OnPreAuthResult({
      type: ResultType.rejected,
      error,
      statusCode: options.statusCode,
    });
  }
  public static isValidResult(candidate: any) {
    return candidate instanceof OnPreAuthResult;
  }
  constructor(public readonly params: NextParams | RejectedParams | RedirectedParams) {}
  public isNext() {
    return this.params.type === ResultType.next;
  }
  public isRedirected() {
    return this.params.type === ResultType.redirected;
  }
  public isRejected() {
    return this.params.type === ResultType.rejected;
  }
}

/**
 * @public
 * A tool set defining an outcome of OnPreAuth interceptor for incoming request.
 */
export interface OnPreAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPreAuthResult;
  /**
   * To interrupt request handling and redirect to a configured url.
   * If "options.forwarded" = true, request will be forwarded to another url right on the server.
   * */
  redirected: (url: string, options?: { forward: boolean }) => OnPreAuthResult;
  /** Fail the request with specified error. */
  rejected: (error: Error, options?: { statusCode?: number }) => OnPreAuthResult;
}

const toolkit: OnPreAuthToolkit = {
  next: OnPreAuthResult.next,
  redirected: OnPreAuthResult.redirected,
  rejected: OnPreAuthResult.rejected,
};

/** @public */
export type OnPreAuthHandler<Params = any, Query = any, Body = any> = (
  req: KibanaRequest<Params, Query, Body>,
  t: OnPreAuthToolkit
) => OnPreAuthResult | Promise<OnPreAuthResult>;

/**
 * @public
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnPreAuthFormat(fn: OnPreAuthHandler) {
  return async function interceptPreAuthRequest(
    request: Request,
    h: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    try {
      const result = await fn(KibanaRequest.from(request, undefined), toolkit);

      if (OnPreAuthResult.isValidResult(result)) {
        if (result.isNext()) {
          return h.continue;
        }

        if (result.isRedirected()) {
          const { url, forward } = result.params as RedirectedParams;
          if (forward) {
            request.setUrl(url);
            // We should update raw request as well since it can be proxied to the old platform
            request.raw.req.url = request.url.href;
            return h.continue;
          }
          return h.redirect(url).takeover();
        }

        if (result.isRejected()) {
          const { error, statusCode } = result.params as RejectedParams;
          return Boom.boomify(error, { statusCode });
        }
      }

      throw new Error(
        `Unexpected result from OnPreAuth. Expected OnPreAuthResult, but given: ${result}.`
      );
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
