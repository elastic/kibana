/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterStateStore } from '@kbn/es-query';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { selectTab, selectTabRuntimeState } from '..';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { fromTabStateToSavedObjectTab } from '../tab_mapping_utils';
import { getTabStateMock } from '../__mocks__/internal_state.mocks';
import { getTabRuntimeStateMock } from '../__mocks__/runtime_state.mocks';
import { DataSourceType } from '../../../../../../common/data_sources';
import type { DiscoverAppState } from '../types';
import * as tabSyncApi from './tab_sync';

const { createUrlSyncObservables, initializeAndSync, stopSyncing } = tabSyncApi;

const setup = async () => {
  const services = createDiscoverServicesMock();
  const { internalState, runtimeStateManager, initializeTabs, initializeSingleTab } =
    getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMockWithTimeField],
    });

  const persistedTab = fromTabStateToSavedObjectTab({
    tab: getTabStateMock({
      id: 'test-tab',
      initialInternalState: {
        serializedSearchSource: {
          index: dataViewMockWithTimeField.id,
          query: { query: '', language: 'kuery' },
        },
      },
      appState: {
        query: { query: '', language: 'kuery' },
        columns: ['field1', 'field2'],
        dataSource: {
          type: DataSourceType.DataView,
          dataViewId: dataViewMockWithTimeField.id!,
        },
        sort: [['@timestamp', 'desc']],
        interval: 'auto',
        hideChart: false,
      },
    }),
    timeRestore: false,
    services,
  });

  const persistedDiscoverSession = createDiscoverSessionMock({
    id: 'test-session',
    tabs: [persistedTab],
  });

  await initializeTabs({ persistedDiscoverSession });

  return {
    internalState,
    runtimeStateManager,
    services,
    tabId: persistedTab.id,
    persistedDiscoverSession,
    initializeSingleTab,
  };
};

describe('tab_sync actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUrlSyncObservables', () => {
    it('should create observables and state containers for URL syncing', async () => {
      const { internalState, tabId } = await setup();

      const result = internalState.dispatch(
        createUrlSyncObservables({
          tabId,
        })
      );

      expect(result).toBeDefined();
      expect(result.appState$).toBeDefined();
      expect(result.appStateContainer).toBeDefined();
      expect(result.globalState$).toBeDefined();
      expect(result.globalStateContainer).toBeDefined();
    });

    it('should allow appStateContainer to get and set app state', async () => {
      const { internalState, tabId } = await setup();

      const result = internalState.dispatch(
        createUrlSyncObservables({
          tabId,
        })
      );

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
      const { internalState, tabId } = await setup();

      const result = internalState.dispatch(
        createUrlSyncObservables({
          tabId,
        })
      );

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
      const { internalState, tabId } = await setup();

      const result = internalState.dispatch(
        createUrlSyncObservables({
          tabId,
        })
      );

      const originalAppState = result.appStateContainer.get();
      result.appStateContainer.set(null);

      const currentAppState = result.appStateContainer.get();
      expect(currentAppState).toEqual(originalAppState);
    });

    it('should not set global state when nothing is passed', async () => {
      const { internalState, tabId } = await setup();

      const result = internalState.dispatch(
        createUrlSyncObservables({
          tabId,
        })
      );

      const originalGlobalState = result.globalStateContainer.get();
      result.globalStateContainer.set(null);

      const currentGlobalState = result.globalStateContainer.get();
      expect(currentGlobalState).toEqual(originalGlobalState);
    });
  });

  describe('initializeAndSync', () => {
    it('should initialize and sync tab state', async () => {
      const { tabId, initializeSingleTab, runtimeStateManager } = await setup();
      const initializeAndSyncSpy = jest.spyOn(tabSyncApi, 'initializeAndSync');
      const onSubscribeSpy = jest.spyOn(
        selectTabRuntimeState(runtimeStateManager, tabId),
        'onSubscribe'
      );

      await initializeSingleTab({ tabId });

      expect(initializeAndSyncSpy).toHaveBeenCalledWith({ tabId });
      expect(onSubscribeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ unsubscribeFn: expect.any(Function) })
      );
    });

    it('should throw error when state container is not initialized', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();

      // Create a tab runtime state without a state container
      const urlSyncObservables = internalState.dispatch(createUrlSyncObservables({ tabId }));
      runtimeStateManager.tabs.byId[tabId] = getTabRuntimeStateMock(urlSyncObservables);

      expect(() => {
        internalState.dispatch(
          initializeAndSync({
            tabId,
          })
        );
      }).toThrow('State container is not initialized');
    });
  });

  describe('stopSyncing', () => {
    it('should stop syncing and call unsubscribe on tab runtime state', async () => {
      const { internalState, runtimeStateManager, tabId } = await setup();

      const urlSyncObservables = internalState.dispatch(createUrlSyncObservables({ tabId }));
      const tabRuntimeState = getTabRuntimeStateMock(urlSyncObservables);
      runtimeStateManager.tabs.byId[tabId] = tabRuntimeState;
      const unsubscribeSpy = jest.spyOn(tabRuntimeState, 'unsubscribe');

      const mockUnsubscribe = jest.fn();

      tabRuntimeState.onSubscribe({ unsubscribeFn: mockUnsubscribe });

      internalState.dispatch(
        stopSyncing({
          tabId,
        })
      );

      expect(unsubscribeSpy).toHaveBeenCalled();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
