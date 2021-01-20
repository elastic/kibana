/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpInterceptController } from './http_intercept_controller';
import { HttpInterceptHaltError } from './http_intercept_halt_error';
import { HttpInterceptor, HttpResponse, HttpFetchOptionsWithPath } from './types';

export async function interceptRequest(
  options: HttpFetchOptionsWithPath,
  interceptors: ReadonlySet<HttpInterceptor>,
  controller: HttpInterceptController
): Promise<HttpFetchOptionsWithPath> {
  let current: HttpFetchOptionsWithPath;

  return [...interceptors].reduceRight(
    (promise, interceptor) =>
      promise.then(
        async (fetchOptions) => {
          current = fetchOptions;
          checkHalt(controller);

          if (!interceptor.request) {
            return fetchOptions;
          }

          const overrides = await interceptor.request(current, controller);
          return {
            ...current,
            ...overrides,
          };
        },
        async (error) => {
          checkHalt(controller, error);

          if (!interceptor.requestError) {
            throw error;
          }

          const overrides = await interceptor.requestError(
            { error, fetchOptions: current },
            controller
          );

          if (!overrides) {
            throw error;
          }

          current = {
            ...current,
            ...overrides,
          };
          return current;
        }
      ),
    Promise.resolve(options)
  );
}

export async function interceptResponse(
  fetchOptions: HttpFetchOptionsWithPath,
  responsePromise: Promise<HttpResponse>,
  interceptors: ReadonlySet<HttpInterceptor>,
  controller: HttpInterceptController
): Promise<HttpResponse> {
  let current: HttpResponse;

  return await [...interceptors].reduce(
    (promise, interceptor) =>
      promise.then(
        async (httpResponse) => {
          current = httpResponse;
          checkHalt(controller);

          if (!interceptor.response) {
            return httpResponse;
          }

          const interceptorOverrides = (await interceptor.response(httpResponse, controller)) || {};

          return {
            ...httpResponse,
            ...interceptorOverrides,
          };
        },
        async (error) => {
          const request = error.request || (current && current.request);

          checkHalt(controller, error);

          if (!interceptor.responseError) {
            throw error;
          }

          try {
            const next = await interceptor.responseError(
              {
                error,
                fetchOptions,
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

            return { ...next, request, fetchOptions };
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
