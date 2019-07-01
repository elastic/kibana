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

interface Next {
  type: ResultType.next;
}

interface Redirected {
  type: ResultType.redirected;
  url: string;
  forward?: boolean;
}

interface Rejected {
  type: ResultType.rejected;
  error: Error;
  statusCode?: number;
}

type OnPreAuthResult = Next | Rejected | Redirected;

const preAuthResult = {
  next(): OnPreAuthResult {
    return { type: ResultType.next };
  },
  redirected(url: string, options: { forward?: boolean } = {}): OnPreAuthResult {
    return { type: ResultType.redirected, url, forward: options.forward };
  },
  rejected(error: Error, options: { statusCode?: number } = {}): OnPreAuthResult {
    return { type: ResultType.rejected, error, statusCode: options.statusCode };
  },
  isValid(candidate: any): candidate is OnPreAuthResult {
    return (
      candidate &&
      (candidate.type === ResultType.next ||
        candidate.type === ResultType.rejected ||
        candidate.type === ResultType.redirected)
    );
  },
  isNext(result: OnPreAuthResult): result is Next {
    return result.type === ResultType.next;
  },
  isRedirected(result: OnPreAuthResult): result is Redirected {
    return result.type === ResultType.redirected;
  },
  isRejected(result: OnPreAuthResult): result is Rejected {
    return result.type === ResultType.rejected;
  },
};

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
  next: preAuthResult.next,
  redirected: preAuthResult.redirected,
  rejected: preAuthResult.rejected,
};

/** @public */
export type OnPreAuthHandler<Params = any, Query = any, Body = any> = (
  request: KibanaRequest<Params, Query, Body>,
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
      const result = await fn(KibanaRequest.from(request), toolkit);

      if (!preAuthResult.isValid(result)) {
        throw new Error(
          `Unexpected result from OnPreAuth. Expected OnPreAuthResult, but given: ${result}.`
        );
      }
      if (preAuthResult.isNext(result)) {
        return h.continue;
      }

      if (preAuthResult.isRedirected(result)) {
        const { url, forward } = result;
        if (forward) {
          request.setUrl(url);
          // We should update raw request as well since it can be proxied to the old platform
          request.raw.req.url = url;
          return h.continue;
        }
        return h.redirect(url).takeover();
      }

      const { error, statusCode } = result;
      return Boom.boomify(error, { statusCode });
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
