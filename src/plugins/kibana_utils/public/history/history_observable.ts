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

import { Action, History, Location } from 'history';
import { Observable } from 'rxjs';
import { ParsedQuery } from 'query-string';
import deepEqual from 'fast-deep-equal';
import { map } from 'rxjs/operators';
import { getQueryParams } from './get_query_params';
import { distinctUntilChangedWithInitialValue } from '../../common';

/**
 * Convert history.listen into an observable
 * @param history - {@link History} instance
 */
export function createHistoryObservable(
  history: History
): Observable<{ location: Location; action: Action }> {
  return new Observable((observer) => {
    const unlisten = history.listen((location, action) => observer.next({ location, action }));
    return () => {
      unlisten();
    };
  });
}

/**
 * Create an observable that emits every time any of query params change.
 * Uses deepEqual check.
 * @param history - {@link History} instance
 */
export function createQueryParamsObservable(history: History): Observable<ParsedQuery> {
  return createHistoryObservable(history).pipe(
    map(({ location }) => ({ ...getQueryParams(location) })),
    distinctUntilChangedWithInitialValue({ ...getQueryParams(history.location) }, deepEqual)
  );
}

/**
 * Create an observable that emits every time _paramKey_ changes
 * @param history - {@link History} instance
 * @param paramKey - query param key to observe
 */
export function createQueryParamObservable<Param = unknown>(
  history: History,
  paramKey: string
): Observable<Param | null> {
  return createQueryParamsObservable(history).pipe(
    map((params) => (params[paramKey] ?? null) as Param | null),
    distinctUntilChangedWithInitialValue(
      (getQueryParams(history.location)[paramKey] ?? null) as Param | null,
      deepEqual
    )
  );
}
