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
}

interface RejectedParams {
  type: ResultType.rejected;
  error: Error;
  statusCode?: number;
}

/** @internal */
class OnPostAuthResult {
  public static next() {
    return new OnPostAuthResult({ type: ResultType.next });
  }
  public static redirected(url: string) {
    return new OnPostAuthResult({ type: ResultType.redirected, url });
  }
  public static rejected(error: Error, options: { statusCode?: number } = {}) {
    return new OnPostAuthResult({
      type: ResultType.rejected,
      error,
      statusCode: options.statusCode,
    });
  }
  public static isValidResult(candidate: any) {
    return candidate instanceof OnPostAuthResult;
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
 * A tool set defining an outcome of OnPostAuth interceptor for incoming request.
 */
export interface OnPostAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPostAuthResult;
  /** To interrupt request handling and redirect to a configured url */
  redirected: (url: string) => OnPostAuthResult;
  /** Fail the request with specified error. */
  rejected: (error: Error, options?: { statusCode?: number }) => OnPostAuthResult;
}

/** @public */
export type OnPostAuthHandler<Params = any, Query = any, Body = any> = (
  req: KibanaRequest<Params, Query, Body>,
  t: OnPostAuthToolkit
) => OnPostAuthResult | Promise<OnPostAuthResult>;

const toolkit: OnPostAuthToolkit = {
  next: OnPostAuthResult.next,
  redirected: OnPostAuthResult.redirected,
  rejected: OnPostAuthResult.rejected,
};
/**
 * @public
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnPostAuthFormat(fn: OnPostAuthHandler) {
  return async function interceptRequest(
    request: Request,
    h: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    try {
      const result = await fn(KibanaRequest.from(request, undefined), toolkit);
      if (OnPostAuthResult.isValidResult(result)) {
        if (result.isNext()) {
          return h.continue;
        }
        if (result.isRedirected()) {
          const { url } = result.params as RedirectedParams;
          return h.redirect(url).takeover();
        }
        if (result.isRejected()) {
          const { error, statusCode } = result.params as RejectedParams;
          return Boom.boomify(error, { statusCode });
        }
      }

      throw new Error(
        `Unexpected result from OnPostAuth. Expected OnPostAuthResult, but given: ${result}.`
      );
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
