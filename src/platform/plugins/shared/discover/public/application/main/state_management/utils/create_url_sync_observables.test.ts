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
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { getPersistedTabMock } from '../redux/__mocks__/internal_state.mocks';
import { createUrlSyncObservables } from './create_url_sync_observables';
import { selectDataSourceProfileId, selectTab, type DiscoverAppState } from '../redux';

describe('createUrlSyncObservables', () => {
  const setup = async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMockWithTimeField],
    });

    const persistedTab = getPersistedTabMock({
      dataView: dataViewMockWithTimeField,
      services,
    });
    await toolkit.initializeTabs({
      persistedDiscoverSession: createDiscoverSessionMock({
        id: 'test-session',
        tabs: [persistedTab],
      }),
    });

    return {
      result: createUrlSyncObservables({
        tabId: persistedTab.id,
        dispatch: toolkit.internalState.dispatch,
        getState: toolkit.internalState.getState,
        internalState$: from(toolkit.internalState),
      }),
      internalState: toolkit.internalState,
      runtimeStateManager: toolkit.runtimeStateManager,
      tabId: persistedTab.id,
    };
  };

  it('should create observables and state containers for URL syncing', async () => {
    const { result } = await setup();

    expect(result).toBeDefined();
    expect(result.appState$).toBeDefined();
    expect(result.createAppStateContainer).toBeDefined();
    expect(result.globalStateContainer).toBeDefined();
  });

  it('should allow appStateContainer to get and set app state', async () => {
    const { result, internalState, tabId } = await setup();
    const appStateContainer = result.createAppStateContainer(false);

    const currentAppState = appStateContainer.get();
    expect(currentAppState).toBeDefined();
    expect(currentAppState.query).toBeDefined();

    let state = internalState.getState();
    let tab = selectTab(state, tabId);
    expect(tab.appState.hideChart).toBe(false);

    const newAppState: DiscoverAppState = {
      ...currentAppState,
      hideChart: true,
    };

    appStateContainer.set(newAppState);

    state = internalState.getState();
    tab = selectTab(state, tabId);
    expect(tab.appState.hideChart).toBe(true);
  });

  it('should not sync previous state snapshots when urlAppStateContainer sets app state', async () => {
    const { result, internalState, runtimeStateManager, tabId } = await setup();
    const urlAppStateContainer = result.createAppStateContainer(true);

    const currentAppState = urlAppStateContainer.get();
    expect(currentAppState).toBeDefined();
    expect(currentAppState.query).toBeDefined();

    const profileId = selectDataSourceProfileId(runtimeStateManager, tabId);
    const snapshotsByProfileId = selectTab(internalState.getState(), tabId).defaultProfileState
      .snapshotsByProfileId;

    let state = internalState.getState();
    let tab = selectTab(state, tabId);
    expect(tab.appState.hideChart).toBe(false);

    const newAppState: DiscoverAppState = {
      ...currentAppState,
      hideChart: true,
    };

    urlAppStateContainer.set(newAppState);

    state = internalState.getState();
    tab = selectTab(state, tabId);
    expect(tab.appState.hideChart).toBe(true);
    expect(tab.defaultProfileState.snapshotsByProfileId).toBe(snapshotsByProfileId);
    expect(tab.defaultProfileState.snapshotsByProfileId[profileId]).toBe(
      snapshotsByProfileId[profileId]
    );
  });

  it('should allow globalStateContainer to get and set global state', async () => {
    const { result, internalState, tabId } = await setup();

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
    const { result } = await setup();
    const appStateContainer = result.createAppStateContainer(false);

    const originalAppState = appStateContainer.get();
    appStateContainer.set(null);

    const currentAppState = appStateContainer.get();
    expect(currentAppState).toBe(originalAppState);
  });

  it('should not set app state when nothing is passed to urlAppStateContainer', async () => {
    const { result } = await setup();
    const urlAppStateContainer = result.createAppStateContainer(true);

    const originalAppState = urlAppStateContainer.get();
    urlAppStateContainer.set(null);

    const currentAppState = urlAppStateContainer.get();
    expect(currentAppState).toBe(originalAppState);
  });

  it('should not set global state when nothing is passed', async () => {
    const { result } = await setup();

    const originalGlobalState = result.globalStateContainer.get();
    result.globalStateContainer.set(null);

    const currentGlobalState = result.globalStateContainer.get();
    expect(currentGlobalState).toEqual(originalGlobalState);
  });
});
