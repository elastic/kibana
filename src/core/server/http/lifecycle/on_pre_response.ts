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

import { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from 'hapi';
import Boom from 'boom';
import { Logger } from '../../logging';

import { HapiResponseAdapter, KibanaRequest, ResponseHeaders } from '../router';

enum ResultType {
  next = 'next',
}

interface Next {
  type: ResultType.next;
  headers?: ResponseHeaders;
}

/**
 * @internal
 */
type OnPreResponseResult = Next;

/**
 * Additional data to extend a response.
 * @public
 */
export interface OnPreResponseExtensions {
  /** additional headers to attach to the response */
  headers?: ResponseHeaders;
}

/**
 * Response status code.
 * @public
 */
export interface OnPreResponseInfo {
  statusCode: number;
}

const preResponseResult = {
  next(responseExtensions?: OnPreResponseExtensions): OnPreResponseResult {
    return { type: ResultType.next, headers: responseExtensions?.headers };
  },
  isNext(result: OnPreResponseResult): result is Next {
    return result && result.type === ResultType.next;
  },
};

/**
 * A tool set defining an outcome of OnPreAuth interceptor for incoming request.
 * @public
 */
export interface OnPreResponseToolkit {
  /** To pass request to the next handler */
  next: (responseExtensions?: OnPreResponseExtensions) => OnPreResponseResult;
}

const toolkit: OnPreResponseToolkit = {
  next: preResponseResult.next,
};

/**
 * See {@link OnPreAuthToolkit}.
 * @public
 */
export type OnPreResponseHandler = (
  request: KibanaRequest,
  preResponse: OnPreResponseInfo,
  toolkit: OnPreResponseToolkit
) => OnPreResponseResult | Promise<OnPreResponseResult>;

/**
 * @public
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnPreResponseFormat(fn: OnPreResponseHandler, log: Logger) {
  return async function interceptPreResponse(
    request: Request,
    responseToolkit: HapiResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const response = request.response;

    try {
      if (response) {
        const statusCode: number = isBoom(response)
          ? response.output.statusCode
          : response.statusCode;

        const result = await fn(KibanaRequest.from(request), { statusCode }, toolkit);
        if (!preResponseResult.isNext(result)) {
          throw new Error(
            `Unexpected result from OnPreResponse. Expected OnPreResponseResult, but given: ${result}.`
          );
        }
        if (result.headers) {
          if (isBoom(response)) {
            findHeadersIntersection(response.output.headers, result.headers, log);
            // hapi wraps all error response in Boom object internally
            response.output.headers = {
              ...response.output.headers,
              ...(result.headers as any), // hapi types don't specify string[] as valid value
            };
          } else {
            findHeadersIntersection(response.headers, result.headers, log);
            for (const [headerName, headerValue] of Object.entries(result.headers)) {
              response.header(headerName, headerValue as any); // hapi types don't specify string[] as valid value
            }
          }
        }
      }
    } catch (error) {
      log.error(error);
      const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
      return hapiResponseAdapter.toInternalError();
    }
    return responseToolkit.continue;
  };
}

function isBoom(response: any): response is Boom {
  return response instanceof Boom;
}

// NOTE: responseHeaders contains not a full list of response headers, but only explicitly set on a response object.
// any headers added by hapi internally, like `content-type`, `content-length`, etc. are not present here.
function findHeadersIntersection(
  responseHeaders: ResponseHeaders,
  headers: ResponseHeaders,
  log: Logger
) {
  Object.keys(headers).forEach((headerName) => {
    if (Reflect.has(responseHeaders, headerName)) {
      log.warn(`onPreResponseHandler rewrote a response header [${headerName}].`);
    }
  });
}
