/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, History, Location } from 'history';
import type { Observable } from 'rxjs';
import type { ParsedQuery } from 'query-string';
/**
 * Convert history.listen into an observable
 * @param history - {@link History} instance
 */
export declare function createHistoryObservable(history: History): Observable<{
  location: Location;
  action: Action;
}>;
/**
 * Create an observable that emits every time any of query params change.
 * Uses deepEqual check.
 * @param history - {@link History} instance
 */
export declare function createQueryParamsObservable(history: History): Observable<ParsedQuery>;
/**
 * Create an observable that emits every time _paramKey_ changes
 * @param history - {@link History} instance
 * @param paramKey - query param key to observe
 */
export declare function createQueryParamObservable<Param = unknown>(
  history: History,
  paramKey: string
): Observable<Param | null>;
