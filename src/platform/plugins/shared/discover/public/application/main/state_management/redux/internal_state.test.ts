/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExistenceFetchStatus } from '@kbn/unified-field-list';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  selectTabRuntimeState,
  selectTab,
} from '.';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
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
    expect(selectTab(store.getState(), tabId).attributes.controlGroupState).toBeUndefined();

    store.dispatch(
      internalStateActions.updateAttributes({
        tabId,
        attributes: { controlGroupState: mockControlState },
      })
    );
    expect(selectTab(store.getState(), tabId).attributes.controlGroupState).toEqual(
      mockControlState
    );
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

  it('should set expandedDoc and initialDocViewerTabId for a specific tab', async () => {
    const { store } = await createTestStore();
    const tabId = store.getState().tabs.unsafeCurrentId;
    const mockDoc = buildDataTableRecord({ _index: 'test', _id: 'doc1' }, dataViewMock);

    expect(selectTab(store.getState(), tabId).expandedDoc).toBeUndefined();
    expect(selectTab(store.getState(), tabId).initialDocViewerTabId).toBeUndefined();

    store.dispatch(
      internalStateActions.setExpandedDoc({
        tabId,
        expandedDoc: mockDoc,
        initialDocViewerTabId: 'Table',
      })
    );

    expect(selectTab(store.getState(), tabId).expandedDoc).toBe(mockDoc);
    expect(selectTab(store.getState(), tabId).initialDocViewerTabId).toBe('Table');
  });

  it('should maintain separate expandedDoc state for different tabs', async () => {
    const { store } = await createTestStore();
    const initialTabId = store.getState().tabs.unsafeCurrentId;
    const mockDoc1 = buildDataTableRecord({ _index: 'test', _id: 'doc1' }, dataViewMock);
    const mockDoc2 = buildDataTableRecord({ _index: 'test', _id: 'doc2' }, dataViewMock);

    store.dispatch(
      internalStateActions.setExpandedDoc({
        tabId: initialTabId,
        expandedDoc: mockDoc1,
        initialDocViewerTabId: 'Table',
      })
    );

    await store.dispatch(
      internalStateActions.openInNewTab({
        tabLabel: 'Second tab',
      })
    );
    const secondTabId = store.getState().tabs.unsafeCurrentId;

    store.dispatch(
      internalStateActions.setExpandedDoc({
        tabId: secondTabId,
        expandedDoc: mockDoc2,
        initialDocViewerTabId: 'JSON',
      })
    );

    expect(selectTab(store.getState(), initialTabId).expandedDoc).toBe(mockDoc1);
    expect(selectTab(store.getState(), initialTabId).initialDocViewerTabId).toBe('Table');
    expect(selectTab(store.getState(), secondTabId).expandedDoc).toBe(mockDoc2);
    expect(selectTab(store.getState(), secondTabId).initialDocViewerTabId).toBe('JSON');
  });

  it('should clear expandedDoc state when resetOnSavedSearchChange is dispatched', async () => {
    const { store } = await createTestStore();
    const tabId = store.getState().tabs.unsafeCurrentId;
    const mockDoc = buildDataTableRecord({ _index: 'test', _id: 'doc1' }, dataViewMock);

    store.dispatch(
      internalStateActions.setExpandedDoc({
        tabId,
        expandedDoc: mockDoc,
        initialDocViewerTabId: 'Table',
      })
    );

    expect(selectTab(store.getState(), tabId).expandedDoc).toBe(mockDoc);

    store.dispatch(internalStateActions.resetOnSavedSearchChange({ tabId }));

    expect(selectTab(store.getState(), tabId).expandedDoc).toBeUndefined();
    expect(selectTab(store.getState(), tabId).initialDocViewerTabId).toBeUndefined();
  });
});
