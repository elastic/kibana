/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, scan, BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';

import { setSearchQuery, searchSlice } from './search_slice';

export interface Action {
  type: string;
  payload: any;
}

// Create a Subject to act as an event bus
export const eventBus$ = new BehaviorSubject<Action>({
  type: 'init',
  payload: null,
});

// Any part of the app can publish an event
export function dispatch(action: Action) {
  eventBus$.next(action);
}

// Plugins or components can subscribe to events
export const subscribe = (cb: any) =>
  eventBus$
    .pipe(scan(searchSlice.reducer, { query: '' }), distinctUntilChanged(isEqual))
    .subscribe(cb);
export type Subscribe = typeof subscribe;

// Publishing an event
dispatch(setSearchQuery('new search term'));
