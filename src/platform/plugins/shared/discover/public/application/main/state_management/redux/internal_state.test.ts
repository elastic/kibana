/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  selectTabRuntimeState,
  selectTab,
} from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { mockControlState } from '../../../../__mocks__/esql_controls';
import { mockCustomizationContext } from '../../../../customizations/__mocks__/customization_context';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createTabsStorageManager } from '../tabs_storage_manager';
import { DiscoverSearchSessionManager } from '../discover_search_session';

describe('InternalStateStore', () => {
  const createTestStore = async () => {
    const services = createDiscoverServicesMock();
    const urlStateStorage = createKbnUrlStateStorage();
    const runtimeStateManager = createRuntimeStateManager();
    const tabsStorageManager = createTabsStorageManager({
      urlStateStorage,
      storage: services.storage,
    });
    const store = createInternalStateStore({
      services,
      customizationContext: mockCustomizationContext,
      runtimeStateManager,
      urlStateStorage,
      tabsStorageManager,
      searchSessionManager: new DiscoverSearchSessionManager({
        history: services.history,
        session: services.data.search.session,
      }),
    });
    await store.dispatch(internalStateActions.initializeTabs({ discoverSessionId: undefined }));

    return { store, runtimeStateManager };
  };

  it('should set data view', async () => {
    const { store, runtimeStateManager } = await createTestStore();
    const tabId = store.getState().tabs.unsafeCurrentId;
    expect(
      selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.value
    ).toBeUndefined();
    store.dispatch(internalStateActions.setDataView({ tabId, dataView: dataViewMock }));
    expect(selectTabRuntimeState(runtimeStateManager, tabId).currentDataView$.value).toBe(
      dataViewMock
    );
  });

  it('should append a new tab to the tabs list', async () => {
    const { store } = await createTestStore();
    const initialTabId = store.getState().tabs.unsafeCurrentId;
    expect(store.getState().tabs.allIds).toHaveLength(1);
    expect(store.getState().tabs.unsafeCurrentId).toBe(initialTabId);
    const params = {
      tabLabel: 'New tab',
      searchSessionId: 'session_123',
      appState: {
        query: { query: 'test this', language: 'kuery' },
      },
      globalState: {
        timeRange: {
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-02T00:00:00.000Z',
        },
      },
    };
    await store.dispatch(internalStateActions.openInNewTab(params));
    const tabsState = store.getState().tabs;
    expect(tabsState.allIds).toHaveLength(2);
    expect(tabsState.unsafeCurrentId).not.toBe(initialTabId);
    expect(tabsState.unsafeCurrentId).toBe(tabsState.allIds[1]);
    expect(tabsState.byId[tabsState.unsafeCurrentId].label).toBe(params.tabLabel);
    expect(tabsState.byId[tabsState.unsafeCurrentId].appState).toEqual(params.appState);
    expect(tabsState.byId[tabsState.unsafeCurrentId].globalState).toEqual(params.globalState);
    expect(tabsState.byId[tabsState.unsafeCurrentId].initialInternalState).toEqual({
      searchSessionId: params.searchSessionId,
    });
  });

  it('should set control state', async () => {
    const { store } = await createTestStore();
    await store.dispatch(internalStateActions.initializeTabs({ discoverSessionId: undefined }));
    const tabId = store.getState().tabs.unsafeCurrentId;
    expect(selectTab(store.getState(), tabId).controlGroupState).toBeUndefined();

    store.dispatch(
      internalStateActions.setControlGroupState({ tabId, controlGroupState: mockControlState })
    );
    expect(selectTab(store.getState(), tabId).controlGroupState).toEqual(mockControlState);
  });
});
