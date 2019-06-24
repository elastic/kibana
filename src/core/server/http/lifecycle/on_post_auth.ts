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
}

interface Rejected {
  type: ResultType.rejected;
  error: Error;
  statusCode?: number;
}

type OnPostAuthResult = Next | Rejected | Redirected;

const postAuthResult = {
  next(): OnPostAuthResult {
    return { type: ResultType.next };
  },
  redirected(url: string): OnPostAuthResult {
    return { type: ResultType.redirected, url };
  },
  rejected(error: Error, options: { statusCode?: number } = {}): OnPostAuthResult {
    return { type: ResultType.rejected, error, statusCode: options.statusCode };
  },
  isValid(candidate: any): candidate is OnPostAuthResult {
    return (
      candidate &&
      (candidate.type === ResultType.next ||
        candidate.type === ResultType.rejected ||
        candidate.type === ResultType.redirected)
    );
  },
  isNext(result: OnPostAuthResult): result is Next {
    return result.type === ResultType.next;
  },
  isRedirected(result: OnPostAuthResult): result is Redirected {
    return result.type === ResultType.redirected;
  },
  isRejected(result: OnPostAuthResult): result is Rejected {
    return result.type === ResultType.rejected;
  },
};

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
  request: KibanaRequest<Params, Query, Body>,
  t: OnPostAuthToolkit
) => OnPostAuthResult | Promise<OnPostAuthResult>;

const toolkit: OnPostAuthToolkit = {
  next: postAuthResult.next,
  redirected: postAuthResult.redirected,
  rejected: postAuthResult.rejected,
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
      const result = await fn(KibanaRequest.from(request), toolkit);
      if (!postAuthResult.isValid(result)) {
        throw new Error(
          `Unexpected result from OnPostAuth. Expected OnPostAuthResult, but given: ${result}.`
        );
      }
      if (postAuthResult.isNext(result)) {
        return h.continue;
      }
      if (postAuthResult.isRedirected(result)) {
        return h.redirect(result.url).takeover();
      }
      const { error, statusCode } = result;
      return Boom.boomify(error, { statusCode });
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
