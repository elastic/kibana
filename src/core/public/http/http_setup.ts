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

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  endWith,
  map,
  pairwise,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { merge } from 'lodash';
import { format } from 'url';
import { InjectedMetadataSetup } from '../injected_metadata';
import { FatalErrorsSetup } from '../fatal_errors';
import { HttpFetchOptions, HttpServiceBase, HttpInterceptor, HttpResponse } from './types';
import { HttpInterceptController } from './http_intercept_controller';
import { HttpFetchError } from './http_fetch_error';
import { HttpInterceptHaltError } from './http_intercept_halt_error';
import { BasePath } from './base_path_service';

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const NDJSON_CONTENT = /^(application\/ndjson)(;.*)?$/;

function checkHalt(controller: HttpInterceptController, error?: Error) {
  if (error instanceof HttpInterceptHaltError) {
    throw error;
  } else if (controller.halted) {
    throw new HttpInterceptHaltError();
  }
}

export const setup = (
  injectedMetadata: InjectedMetadataSetup,
  fatalErrors: FatalErrorsSetup | null
): HttpServiceBase => {
  const loadingCount$ = new BehaviorSubject(0);
  const stop$ = new Subject();
  const interceptors = new Set<HttpInterceptor>();
  const kibanaVersion = injectedMetadata.getKibanaVersion();
  const basePath = new BasePath(injectedMetadata.getBasePath());

  function intercept(interceptor: HttpInterceptor) {
    interceptors.add(interceptor);

    return () => interceptors.delete(interceptor);
  }

  function removeAllInterceptors() {
    interceptors.clear();
  }

  function createRequest(path: string, options?: HttpFetchOptions) {
    const { query, prependBasePath: shouldPrependBasePath, ...fetchOptions } = merge(
      {
        method: 'GET',
        credentials: 'same-origin',
        prependBasePath: true,
        headers: {
          'kbn-version': kibanaVersion,
          'Content-Type': 'application/json',
        },
      },
      options || {}
    );
    const url = format({
      pathname: shouldPrependBasePath ? basePath.prepend(path) : path,
      query,
    });

    if (
      options &&
      options.headers &&
      'Content-Type' in options.headers &&
      options.headers['Content-Type'] === undefined
    ) {
      delete fetchOptions.headers['Content-Type'];
    }

    return new Request(url, fetchOptions);
  }

  // Request/response interceptors are called in opposite orders.
  // Request hooks start from the newest interceptor and end with the oldest.
  function interceptRequest(
    request: Request,
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

            const nextRequest = await interceptor.requestError(
              { error, request: next },
              controller
            );

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

  // Response hooks start from the oldest interceptor and end with the newest.
  async function interceptResponse(
    responsePromise: Promise<HttpResponse>,
    controller: HttpInterceptController
  ) {
    let current: HttpResponse | undefined;

    const finalHttpResponse = await [...interceptors].reduce(
      (promise, interceptor) =>
        promise.then(
          async httpResponse => {
            current = httpResponse;
            checkHalt(controller);

            if (!interceptor.response) {
              return httpResponse;
            }

            return {
              ...httpResponse,
              ...((await interceptor.response(httpResponse, controller)) || {}),
            };
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

              return { ...next, request };
            } catch (err) {
              checkHalt(controller, err);
              throw err;
            }
          }
        ),
      responsePromise
    );

    return finalHttpResponse.body;
  }

  async function fetcher(request: Request): Promise<HttpResponse> {
    let response;
    let body = null;

    try {
      response = await window.fetch(request);
    } catch (err) {
      throw new HttpFetchError(err.message, request);
    }

    const contentType = response.headers.get('Content-Type') || '';

    try {
      if (NDJSON_CONTENT.test(contentType)) {
        body = await response.blob();
      } else if (JSON_CONTENT.test(contentType)) {
        body = await response.json();
      } else {
        const text = await response.text();

        try {
          body = JSON.parse(text);
        } catch (err) {
          body = text;
        }
      }
    } catch (err) {
      throw new HttpFetchError(err.message, request, response, body);
    }

    if (!response.ok) {
      throw new HttpFetchError(response.statusText, request, response, body);
    }

    return { response, body, request };
  }

  async function fetch(path: string, options: HttpFetchOptions = {}) {
    const controller = new HttpInterceptController();
    const initialRequest = createRequest(path, options);

    // We wrap the interception in a separate promise to ensure that when
    // a halt is called we do not resolve or reject, halting handling of the promise.
    return new Promise(async (resolve, reject) => {
      function rejectIfNotHalted(err: any) {
        if (!(err instanceof HttpInterceptHaltError)) {
          reject(err);
        }
      }

      try {
        const request = await interceptRequest(initialRequest, controller);

        try {
          resolve(await interceptResponse(fetcher(request), controller));
        } catch (err) {
          rejectIfNotHalted(err);
        }
      } catch (err) {
        rejectIfNotHalted(err);
      }
    });
  }

  function shorthand(method: string) {
    return (path: string, options: HttpFetchOptions = {}) => fetch(path, { ...options, method });
  }

  function stop() {
    stop$.next();
    loadingCount$.complete();
  }

  function addLoadingCount(count$: Observable<number>) {
    count$
      .pipe(
        distinctUntilChanged(),

        tap(count => {
          if (count < 0) {
            throw new Error(
              'Observables passed to loadingCount.add() must only emit positive numbers'
            );
          }
        }),

        // use takeUntil() so that we can finish each stream on stop() the same way we do when they complete,
        // by removing the previous count from the total
        takeUntil(stop$),
        endWith(0),
        startWith(0),
        pairwise(),
        map(([prev, next]) => next - prev)
      )
      .subscribe({
        next: delta => {
          loadingCount$.next(loadingCount$.getValue() + delta);
        },
        error: error => {
          if (fatalErrors) {
            fatalErrors.add(error);
          }
        },
      });
  }

  function getLoadingCount$() {
    return loadingCount$.pipe(distinctUntilChanged());
  }

  return {
    stop,
    basePath,
    intercept,
    removeAllInterceptors,
    fetch,
    delete: shorthand('DELETE'),
    get: shorthand('GET'),
    head: shorthand('HEAD'),
    options: shorthand('OPTIONS'),
    patch: shorthand('PATCH'),
    post: shorthand('POST'),
    put: shorthand('PUT'),
    addLoadingCount,
    getLoadingCount$,
  };
};
