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
import { modifyUrl } from '../utils';
import { HttpBody, HttpFetchOptions, HttpServiceBase } from './types';
import { HttpFetchError } from './http_fetch_error';

const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;
const NDJSON_CONTENT = /^(application\/ndjson)(;.*)?$/;

export const setup = (
  injectedMetadata: InjectedMetadataSetup,
  fatalErrors: FatalErrorsSetup | null
): HttpServiceBase => {
  const loadingCount$ = new BehaviorSubject(0);
  const stop$ = new Subject();
  const kibanaVersion = injectedMetadata.getKibanaVersion();
  const basePath = injectedMetadata.getBasePath() || '';

  function prependBasePath(path: string): string {
    return modifyUrl(path, parts => {
      if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
        parts.pathname = `${basePath}${parts.pathname}`;
      }
    });
  }

  async function fetch(path: string, options?: HttpFetchOptions): Promise<HttpBody> {
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
      pathname: shouldPrependBasePath ? prependBasePath(path) : path,
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

    let response;
    let body = null;

    try {
      response = await window.fetch(url, fetchOptions as RequestInit);
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

    return body;
  }

  function shorthand(method: string) {
    return (path: string, options: HttpFetchOptions = {}) => fetch(path, { ...options, method });
  }

  function stop() {
    stop$.next();
    loadingCount$.complete();
  }

  function getBasePath() {
    return basePath;
  }

  function removeBasePath(path: string): string {
    if (!basePath) {
      return path;
    }

    if (path === basePath) {
      return '/';
    }

    if (path.startsWith(`${basePath}/`)) {
      return path.slice(basePath.length);
    }

    return path;
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
    getBasePath,
    prependBasePath,
    removeBasePath,
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
