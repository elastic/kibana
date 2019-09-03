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
            if (controller.halted) {
              throw new HttpInterceptHaltError();
            }

            if (!interceptor.request) {
              return current;
            }

            next = (await interceptor.request(current, controller)) || current;

            return next;
          },
          async error => {
            if (error instanceof HttpInterceptHaltError) {
              throw error;
            } else if (controller.halted) {
              throw new HttpInterceptHaltError();
            }

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
    let current: HttpResponse;

    const finalHttpResponse = await [...interceptors].reduce(
      (promise, interceptor) =>
        promise.then(
          async httpResponse => {
            if (controller.halted) {
              throw new HttpInterceptHaltError();
            }

            if (!interceptor.response) {
              return httpResponse;
            }

            current = (await interceptor.response(httpResponse, controller)) || httpResponse;

            return current;
          },
          async error => {
            if (error instanceof HttpInterceptHaltError) {
              throw error;
            } else if (controller.halted) {
              throw new HttpInterceptHaltError();
            }

            if (!interceptor.responseError) {
              throw error;
            }

            const next = await interceptor.responseError({ ...current, error }, controller);

            if (!next) {
              throw error;
            }

            return next;
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
      throw new HttpFetchError(err.message);
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
      throw new HttpFetchError(err.message, response, body);
    }

    if (!response.ok) {
      throw new HttpFetchError(response.statusText, response, body);
    }

    return { response, body, request };
  }

  function fetch(path: string, options: HttpFetchOptions = {}) {
    const controller = new HttpInterceptController();
    const initialRequest = createRequest(path, options);

    return interceptResponse(
      interceptRequest(initialRequest, controller).then(fetcher),
      controller
    );
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
