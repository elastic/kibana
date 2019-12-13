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
import { InjectedMetadataSetup } from '../injected_metadata';
import { FatalErrorsSetup } from '../fatal_errors';
import { HttpFetchOptions, HttpServiceBase } from './types';
import { HttpInterceptController } from './http_intercept_controller';
import { HttpInterceptHaltError } from './http_intercept_halt_error';
import { BasePath } from './base_path_service';
import { AnonymousPaths } from './anonymous_paths';
import { FetchService } from './fetch';

export function checkHalt(controller: HttpInterceptController, error?: Error) {
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
  const kibanaVersion = injectedMetadata.getKibanaVersion();
  const basePath = new BasePath(injectedMetadata.getBasePath());
  const anonymousPaths = new AnonymousPaths(basePath);

  const fetchService = new FetchService({ basePath, kibanaVersion });

  function shorthand(method: string) {
    return (path: string, options: HttpFetchOptions = {}) =>
      fetchService.fetch(path, { ...options, method });
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
    anonymousPaths,
    intercept: fetchService.intercept.bind(fetchService),
    removeAllInterceptors: fetchService.removeAllInterceptors.bind(fetchService),
    fetch: fetchService.fetch.bind(fetchService),
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
