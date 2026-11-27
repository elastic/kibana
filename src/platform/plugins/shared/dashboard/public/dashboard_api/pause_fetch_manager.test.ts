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
  test('starts paused while the initial publish is pending', () => {
    const { api } = initializePauseFetchManager(new BehaviorSubject<boolean>(true));
    expect(api.isFetchPaused$.value).toBe(true);
  });

  test('unpauses once the initial publish is done', () => {
    const initialPublishPending$ = new BehaviorSubject<boolean>(true);
    const { api } = initializePauseFetchManager(initialPublishPending$);
    initialPublishPending$.next(false);
    expect(api.isFetchPaused$.value).toBe(false);
  });

  test('unpauses immediately when the initial publish is already done', () => {
    const { api } = initializePauseFetchManager(new BehaviorSubject<boolean>(false));
    expect(api.isFetchPaused$.value).toBe(false);
  });

  test('pauses again while another initial publish is pending, e.g. when the grid opens', () => {
    const initialPublishPending$ = new BehaviorSubject<boolean>(false);
    const { api } = initializePauseFetchManager(initialPublishPending$);
    initialPublishPending$.next(true);
    expect(api.isFetchPaused$.value).toBe(true);
    initialPublishPending$.next(false);
    expect(api.isFetchPaused$.value).toBe(false);
  });

  test('does not override a manual pause when a later initial publish is done', () => {
    const initialPublishPending$ = new BehaviorSubject<boolean>(true);
    const { api } = initializePauseFetchManager(initialPublishPending$);
    initialPublishPending$.next(false);
    api.setFetchPaused(true);
    initialPublishPending$.next(true);
    initialPublishPending$.next(false);
    expect(api.isFetchPaused$.value).toBe(true);
  });

  test('does not unpause after cleanup', () => {
    const initialPublishPending$ = new BehaviorSubject<boolean>(true);
    const { api, cleanup } = initializePauseFetchManager(initialPublishPending$);
    cleanup();
    initialPublishPending$.next(false);
    expect(api.isFetchPaused$.value).toBe(true);
  });
});
