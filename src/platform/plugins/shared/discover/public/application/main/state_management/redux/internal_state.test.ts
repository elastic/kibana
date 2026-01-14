/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AsyncReturnType } from 'type-fest';

import { ExistenceFetchStatus } from '@kbn/unified-field-list';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  selectTabRuntimeState,
  selectTab,
  createTabActionInjector,
} from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { mockControlState } from '../../../../__mocks__/esql_controls';
import { mockCustomizationContext } from '../../../../customizations/__mocks__/customization_context';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createTabsStorageManager } from '../tabs_storage_manager';
import { DiscoverSearchSessionManager } from '../discover_search_session';

describe('InternalStateStore', () => {
  const services = createDiscoverServicesMock();

  const createTestStore = async () => {
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

  it('should reset fieldListExistingFieldsInfo for the tabs with the same dataViewId', async () => {
    const { store } = await createTestStore();
    const initialTabId = store.getState().tabs.unsafeCurrentId;
    expect(store.getState().tabs.allIds).toHaveLength(1);
    expect(store.getState().tabs.unsafeCurrentId).toBe(initialTabId);
    const items = Array.from({ length: 3 }).map((_, index) => ({
      id: `tab${index}`,
      label: `Tab ${index}`,
    }));
    const testInfo = {
      fetchStatus: ExistenceFetchStatus.succeeded,
      existingFieldsByFieldNameMap: { bytes: true },
      numberOfFetches: 1,
      newFields: undefined,
    };
    await store.dispatch(
      internalStateActions.updateTabs({
        items,
        selectedItem: items[0],
      })
    );
    expect(store.getState().tabs.unsafeCurrentId).toBe(items[0].id);
    items.forEach((item, index) => {
      store.dispatch(
        internalStateActions.setFieldListUiState({
          tabId: item.id,
          fieldListUiState: { nameFilter: `field${index}` },
        })
      );
      store.dispatch(
        internalStateActions.setFieldListExistingFieldsInfoUiState({
          tabId: item.id,
          fieldListExistingFieldsInfo: {
            dataViewId: 'logstash-*',
            dataViewHash: 'logstash-*:logstash-*:time:false:28',
            info: testInfo,
          },
        })
      );
    });

    store.dispatch(
      internalStateActions.setFieldListExistingFieldsInfoUiState({
        tabId: items[1].id,
        fieldListExistingFieldsInfo: {
          dataViewId: 'another-data-view',
          dataViewHash: 'another-data-view:another-data-view:time:false:28',
          info: testInfo,
        },
      })
    );

    store.dispatch(
      internalStateActions.resetAffectedFieldListExistingFieldsInfoUiState({
        dataViewId: 'logstash-*',
      })
    );

    const tabsState = store.getState().tabs;
    expect(tabsState.allIds).toHaveLength(3);
    expect(tabsState.byId[items[0].id].uiState).toMatchInlineSnapshot(`
      Object {
        "fieldList": Object {
          "nameFilter": "field0",
        },
        "fieldListExistingFieldsInfo": undefined,
      }
    `);
    expect(tabsState.byId[items[1].id].uiState).toMatchInlineSnapshot(`
      Object {
        "fieldList": Object {
          "nameFilter": "field1",
        },
        "fieldListExistingFieldsInfo": Object {
          "dataViewHash": "another-data-view:another-data-view:time:false:28",
          "dataViewId": "another-data-view",
          "info": Object {
            "existingFieldsByFieldNameMap": Object {
              "bytes": true,
            },
            "fetchStatus": "succeeded",
            "newFields": undefined,
            "numberOfFetches": 1,
          },
        },
      }
    `);
    expect(tabsState.byId[items[2].id].uiState).toMatchInlineSnapshot(`
      Object {
        "fieldList": Object {
          "nameFilter": "field2",
        },
        "fieldListExistingFieldsInfo": undefined,
      }
    `);
  });

  describe('cascade layout feature flag side effects', () => {
    const cascadeLayoutFeatureFlagSpy = jest.spyOn(
      services.discoverFeatureFlags,
      'getCascadeLayoutEnabled'
    );

    const getCurrentTab = (store: AsyncReturnType<typeof createTestStore>['store']) =>
      selectTab(store.getState(), store.getState().tabs.unsafeCurrentId);

    afterEach(() => {
      // revert to default value
      cascadeLayoutFeatureFlagSpy.mockReturnValue(false);
      cascadeLayoutFeatureFlagSpy.mockClear();
    });

    it('should not compute and set cascade groupings when state updates happen and feature flag evaluation is false', async () => {
      cascadeLayoutFeatureFlagSpy.mockReturnValue(false);

      const { store } = await createTestStore();

      const initialTabId = store.getState().tabs.unsafeCurrentId;

      store.dispatch(
        internalStateActions.setAppState({
          tabId: initialTabId,
          appState: {
            query: { esql: 'FROM my_index | STATS count = Count(message) BY my_field' },
          },
        })
      );

      expect(cascadeLayoutFeatureFlagSpy).toHaveBeenCalled();

      const currentTab = getCurrentTab(store);

      expect(currentTab.cascadedDocumentsState).toBeDefined();

      expect(currentTab.cascadedDocumentsState.availableCascadeGroups).toEqual([]);

      expect(currentTab.cascadedDocumentsState.selectedCascadeGroups).toEqual([]);
    });

    it('should compute and set cascade groupings when state updates happen and the feature flag evaluation is true', async () => {
      cascadeLayoutFeatureFlagSpy.mockReturnValue(true);

      const { store } = await createTestStore();

      const initialTabId = store.getState().tabs.unsafeCurrentId;

      store.dispatch(
        internalStateActions.setAppState({
          tabId: initialTabId,
          appState: {
            query: { esql: 'FROM my_index | STATS count = Count(message) BY my_field' },
          },
        })
      );

      expect(cascadeLayoutFeatureFlagSpy).toHaveBeenCalled();

      const currentTab = getCurrentTab(store);

      expect(currentTab.cascadedDocumentsState).toBeDefined();

      expect(currentTab.cascadedDocumentsState.availableCascadeGroups).toEqual(['my_field']);

      expect(currentTab.cascadedDocumentsState.selectedCascadeGroups).toEqual(['my_field']);
    });

    it('should respect previous cascade group selection when a state update happens as long as the query has not changed', async () => {
      cascadeLayoutFeatureFlagSpy.mockReturnValue(true);

      const { store } = await createTestStore();

      const initialTabId = store.getState().tabs.unsafeCurrentId;

      const initialQuery = {
        esql: 'FROM my_index | STATS count = Count(message) BY field1,field2',
      };

      // 1. Initial update with query with a group by field.
      store.dispatch(
        internalStateActions.setAppState({
          tabId: initialTabId,
          appState: {
            query: initialQuery,
          },
        })
      );

      const currentTabState = getCurrentTab(store);

      // The initial available groups are ['field1', 'field2'].
      expect(currentTabState.cascadedDocumentsState.availableCascadeGroups).toEqual([
        'field1',
        'field2',
      ]);

      // By default, the first group is selected.
      expect(currentTabState.cascadedDocumentsState.selectedCascadeGroups).toEqual(['field1']);

      // 2. Simulate user selects a valid group that is not the first (e.g., 'field2')
      // We mimic this by directly setting the group selection in UI state.
      // In production, this transition is handled by a separate action;
      // Here we simulate how state update with same query uses previous selection if valid.
      const injectCurrentTab = createTabActionInjector(currentTabState.id);
      store.dispatch(
        injectCurrentTab(internalStateActions.setCascadedDocumentsState)({
          cascadedDocumentsState: {
            ...currentTabState.cascadedDocumentsState!,
            selectedCascadeGroups: ['field2'],
          },
        })
      );

      expect(getCurrentTab(store).cascadedDocumentsState!.availableCascadeGroups).toEqual([
        'field1',
        'field2',
      ]);
      // select cascade group should be value "field2" now
      expect(getCurrentTab(store).cascadedDocumentsState.selectedCascadeGroups).toEqual(['field2']);

      // 3. Another state update with the same query, e.g., something else changed, but not the query.
      store.dispatch(
        internalStateActions.setAppState({
          tabId: initialTabId,
          appState: {
            columns: ['example'],
            query: initialQuery,
          },
        })
      );

      expect(getCurrentTab(store).cascadedDocumentsState!.availableCascadeGroups).toEqual([
        'field1',
        'field2',
      ]);
      // Still uses ['field2'] as selected group.
      expect(getCurrentTab(store).cascadedDocumentsState!.selectedCascadeGroups).toEqual([
        'field2',
      ]);

      // 4. Now simulate a query change
      store.dispatch(
        internalStateActions.setAppState({
          tabId: initialTabId,
          appState: {
            columns: ['example'],
            query: { esql: 'FROM my_index | STATS total = Sum(time) BY new_field1, new_field2' },
          },
        })
      );

      // With a new query, we should have new available groups.
      expect(getCurrentTab(store).cascadedDocumentsState!.availableCascadeGroups).toEqual([
        'new_field1',
        'new_field2',
      ]);

      // With a new query, the selected group should be the first group since it's the default.
      expect(getCurrentTab(store).cascadedDocumentsState!.selectedCascadeGroups).toEqual([
        'new_field1',
      ]);
    });
  });
});
