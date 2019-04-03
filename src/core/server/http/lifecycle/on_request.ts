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

class OnRequestResult {
  public static next() {
    return new OnRequestResult(ResultType.next);
  }
  public static redirected(url: string) {
    return new OnRequestResult(ResultType.redirected, url);
  }
  public static rejected(error: Error) {
    return new OnRequestResult(ResultType.rejected, error);
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

const toolkit = {
  next: OnRequestResult.next,
  redirected: OnRequestResult.redirected,
  rejected: OnRequestResult.rejected,
};

export type OnRequest<Params = any, Query = any, Body = any> = (
  req: KibanaRequest<Params, Query, Body>,
  t: typeof toolkit
) => OnRequestResult;
export function adoptToHapiOnRequestFormat(fn: OnRequest) {
  return async function interceptRequest(
    req: Request,
    h: ResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    try {
      const result = await fn(KibanaRequest.from(req, undefined), toolkit);
      if (OnRequestResult.isValidResult(result)) {
        if (result.isNext()) {
          return h.continue;
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
        `Unexpected result from OnRequest. Expected OnRequestResult, but given: ${result}`
      );
    } catch (error) {
      return new Boom(error.message, { statusCode: 500 });
    }
  };
}
