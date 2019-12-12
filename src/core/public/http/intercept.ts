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

import { HttpInterceptController } from './http_intercept_controller';
import { HttpInterceptHaltError } from './http_intercept_halt_error';
import { HttpInterceptor, IHttpResponse } from './types';
import { HttpResponse } from './response';

export async function interceptRequest(
  request: Request,
  interceptors: ReadonlySet<HttpInterceptor>,
  controller: HttpInterceptController
): Promise<Request> {
  let next = request;

  return [...interceptors].reduceRight(
    (promise, interceptor) =>
      promise.then(
        async (current: Request) => {
          next = current;
          checkHalt(controller);

          if (!interceptor.request) {
            return current;
          }

          return (await interceptor.request(current, controller)) || current;
        },
        async error => {
          checkHalt(controller, error);

          if (!interceptor.requestError) {
            throw error;
          }

          const nextRequest = await interceptor.requestError({ error, request: next }, controller);

          if (!nextRequest) {
            throw error;
          }

          next = nextRequest;
          return next;
        }
      ),
    Promise.resolve(request)
  );
}

export async function interceptResponse(
  responsePromise: Promise<IHttpResponse>,
  interceptors: ReadonlySet<HttpInterceptor>,
  controller: HttpInterceptController
): Promise<IHttpResponse> {
  let current: IHttpResponse;

  return await [...interceptors].reduce(
    (promise, interceptor) =>
      promise.then(
        async httpResponse => {
          current = httpResponse;
          checkHalt(controller);

          if (!interceptor.response) {
            return httpResponse;
          }

          const interceptorOverrides = (await interceptor.response(httpResponse, controller)) || {};

          return new HttpResponse({
            ...httpResponse,
            ...interceptorOverrides,
          });
        },
        async error => {
          const request = error.request || (current && current.request);

          checkHalt(controller, error);

          if (!interceptor.responseError) {
            throw error;
          }

          try {
            const next = await interceptor.responseError(
              {
                error,
                request,
                response: error.response || (current && current.response),
                body: error.body || (current && current.body),
              },
              controller
            );

            checkHalt(controller, error);

            if (!next) {
              throw error;
            }

            return new HttpResponse({ ...next, request });
          } catch (err) {
            checkHalt(controller, err);
            throw err;
          }
        }
      ),
    responsePromise
  );
}

function checkHalt(controller: HttpInterceptController, error?: Error) {
  if (error instanceof HttpInterceptHaltError) {
    throw error;
  } else if (controller.halted) {
    throw new HttpInterceptHaltError();
  }
}
