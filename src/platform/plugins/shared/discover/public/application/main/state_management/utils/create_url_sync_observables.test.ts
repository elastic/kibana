/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from 'rxjs';
import { FilterStateStore } from '@kbn/es-query-constants';
import { createUrlSyncObservables } from './create_url_sync_observables';
import { createReduxTestSetup } from '../redux/__mocks__/create_redux_test_setup';
import { selectTab } from '../redux/selectors';
import type { DiscoverAppState } from '../redux/types';

describe('createUrlSyncObservables', () => {
  const getResult = async () => {
    const { internalState, tabId } = await createReduxTestSetup();

    return {
      result: createUrlSyncObservables({
        tabId,
        dispatch: internalState.dispatch,
        getState: internalState.getState,
        internalState$: from(internalState),
      }),
      internalState,
      tabId,
    };
  };

  it('should create observables and state containers for URL syncing', async () => {
    const { result } = await getResult();

    expect(result).toBeDefined();
    expect(result.appState$).toBeDefined();
    expect(result.appStateContainer).toBeDefined();
    expect(result.globalState$).toBeDefined();
    expect(result.globalStateContainer).toBeDefined();
  });

  it('should allow appStateContainer to get and set app state', async () => {
    const { result, internalState, tabId } = await getResult();

    const currentAppState = result.appStateContainer.get();
    expect(currentAppState).toBeDefined();
    expect(currentAppState.query).toBeDefined();

    let state = internalState.getState();
    let tab = selectTab(state, tabId);
    expect(tab.appState.hideChart).toBe(false);

    const newAppState: DiscoverAppState = {
      ...currentAppState,
      hideChart: true,
    };

    result.appStateContainer.set(newAppState);

    state = internalState.getState();
    tab = selectTab(state, tabId);
    expect(tab.appState.hideChart).toBe(true);
  });

  it('should allow globalStateContainer to get and set global state', async () => {
    const { result, internalState, tabId } = await getResult();

    const currentGlobalState = result.globalStateContainer.get();
    expect(currentGlobalState).toBeDefined();
    expect(currentGlobalState).toHaveProperty('time');
    expect(currentGlobalState).toHaveProperty('refreshInterval');
    expect(currentGlobalState).toHaveProperty('filters');

    let state = internalState.getState();
    let tab = selectTab(state, tabId);
    expect(tab.globalState.filters).toBeUndefined();

    const newFilters = [
      {
        meta: { index: 'test-index' },
        query: { match_all: {} },
        $state: { store: FilterStateStore.GLOBAL_STATE },
      },
    ];

    result.globalStateContainer.set({
      time: currentGlobalState.time,
      refreshInterval: currentGlobalState.refreshInterval,
      filters: newFilters,
    });

    state = internalState.getState();
    tab = selectTab(state, tabId);
    expect(tab.globalState.filters).toEqual(newFilters);
  });

  it('should not set app state when nothing is passed', async () => {
    const { result } = await getResult();

    const originalAppState = result.appStateContainer.get();
    result.appStateContainer.set(null);

    const currentAppState = result.appStateContainer.get();
    expect(currentAppState).toEqual(originalAppState);
  });

  it('should not set global state when nothing is passed', async () => {
    const { result } = await getResult();

    const originalGlobalState = result.globalStateContainer.get();
    result.globalStateContainer.set(null);

    const currentGlobalState = result.globalStateContainer.get();
    expect(currentGlobalState).toEqual(originalGlobalState);
  });
});
