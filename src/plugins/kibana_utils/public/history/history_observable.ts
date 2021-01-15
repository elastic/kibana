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

import { History, Location, Action } from 'history';
import { Observable } from 'rxjs';
import { ParsedQuery } from 'query-string';
import deepEqual from 'fast-deep-equal';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { getQueryParams } from './get_query_params';

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

export function createQueryParamsObservable(history: History): Observable<ParsedQuery> {
  return createHistoryObservable(history).pipe(
    map(({ location }) => getQueryParams(location), distinctUntilChanged(deepEqual))
  );
}

export function createQueryParamObservable<Param = unknown>(
  history: History,
  paramKey: string
): Observable<Param | null> {
  return createQueryParamsObservable(history).pipe(
    map((params) => (params[paramKey] ?? null) as Param | null)
  );
}
