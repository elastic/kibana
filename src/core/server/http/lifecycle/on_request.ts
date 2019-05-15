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

import { Url } from 'url';
import Boom from 'boom';
import { Lifecycle, Request, ResponseToolkit } from 'hapi';
import { KibanaRequest } from '../router';

enum ResultType {
  next = 'next',
  redirected = 'redirected',
  rejected = 'rejected',
}

/** @internal */
class OnRequestResult {
  public static next() {
    return new OnRequestResult(ResultType.next);
  }
  public static redirected(url: string) {
    return new OnRequestResult(ResultType.redirected, url);
  }
  public static rejected(error: Error, options: { statusCode?: number } = {}) {
    return new OnRequestResult(ResultType.rejected, { error, statusCode: options.statusCode });
  }
  public static isValidResult(candidate: any) {
    return candidate instanceof OnRequestResult;
  }
  constructor(private readonly type: ResultType, public readonly payload?: any) {}
  public isNext() {
    return this.type === ResultType.next;
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
 * A tool set defining an outcome of OnRequest interceptor for incoming request.
 */
export interface OnRequestToolkit {
  /** To pass request to the next handler */
  next: () => OnRequestResult;
  /** To interrupt request handling and redirect to a configured url */
  redirected: (url: string) => OnRequestResult;
  /** Fail the request with specified error. */
  rejected: (error: Error, options?: { statusCode?: number }) => OnRequestResult;
  /** Change url for an incoming request. */
  setUrl: (newUrl: string | Url) => void;
}

/** @public */
export type OnRequestHandler<Params = any, Query = any, Body = any> = (
  req: KibanaRequest<Params, Query, Body>,
  t: OnRequestToolkit
) => OnRequestResult | Promise<OnRequestResult>;

/**
 * @public
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnRequestFormat(fn: OnRequestHandler) {
  return async function interceptRequest(
    request: Request,
    h: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    try {
      const result = await fn(KibanaRequest.from(request, undefined), {
        next: OnRequestResult.next,
        redirected: OnRequestResult.redirected,
        rejected: OnRequestResult.rejected,
        setUrl: (newUrl: string | Url) => {
          request.setUrl(newUrl);
          // We should update raw request as well since it can be proxied to the old platform
          request.raw.req.url = typeof newUrl === 'string' ? newUrl : newUrl.href;
        },
      });
      if (OnRequestResult.isValidResult(result)) {
        if (result.isNext()) {
          return h.continue;
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
        `Unexpected result from OnRequest. Expected OnRequestResult, but given: ${result}.`
      );
    } catch (error) {
      return Boom.internal(error.message, { statusCode: 500 });
    }
  };
}
