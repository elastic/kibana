/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { initializePauseFetchManager } from './pause_fetch_manager';

describe('initializePauseFetchManager', () => {
  test('starts paused while children are loading', () => {
    const childrenLoading$ = new BehaviorSubject<boolean>(true);
    const { api } = initializePauseFetchManager(childrenLoading$);
    expect(api.isFetchPaused$.value).toBe(true);
  });

  test('unpauses once children are done loading', () => {
    const childrenLoading$ = new BehaviorSubject<boolean>(true);
    const { api } = initializePauseFetchManager(childrenLoading$);
    childrenLoading$.next(false);
    expect(api.isFetchPaused$.value).toBe(false);
  });

  test('unpauses immediately when children are already loaded', () => {
    const { api } = initializePauseFetchManager(new BehaviorSubject<boolean>(false));
    expect(api.isFetchPaused$.value).toBe(false);
  });

  test('only unpauses automatically once, so a later loading cycle does not override a manual pause', () => {
    const childrenLoading$ = new BehaviorSubject<boolean>(true);
    const { api } = initializePauseFetchManager(childrenLoading$);
    childrenLoading$.next(false);
    api.setFetchPaused(true);
    childrenLoading$.next(true);
    childrenLoading$.next(false);
    expect(api.isFetchPaused$.value).toBe(true);
  });

  test('does not unpause after cleanup', () => {
    const childrenLoading$ = new BehaviorSubject<boolean>(true);
    const { api, cleanup } = initializePauseFetchManager(childrenLoading$);
    cleanup();
    childrenLoading$.next(false);
    expect(api.isFetchPaused$.value).toBe(true);
  });
});
