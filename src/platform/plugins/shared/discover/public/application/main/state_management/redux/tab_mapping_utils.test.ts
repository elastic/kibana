/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getTabStateMock, getPersistedTabMock } from './__mocks__/internal_state.mocks';
import {
  fromSavedObjectTabToTabState,
  fromSavedObjectTabToSavedSearch,
  fromTabStateToSavedObjectTab,
  fromSavedSearchToSavedObjectTab,
} from './tab_mapping_utils';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';

const services = createDiscoverServicesMock();
const tab1 = getTabStateMock({
  id: '1',
  label: 'Tab 1',
  duplicatedFromId: '0',
  initialInternalState: {
    serializedSearchSource: { index: 'test-data-view-1' },
  },
  attributes: {
    visContext: { foo: 'bar' },
    controlGroupState: undefined,
  },
  globalState: {
    timeRange: { from: 'now-7d', to: 'now' },
    refreshInterval: { pause: true, value: 500 },
  },
  appState: { columns: ['column1'] },
});
const tab2 = getTabStateMock({
  id: '2',
  label: 'Tab 2',
  initialInternalState: {
    serializedSearchSource: { index: 'test-data-view-2' },
  },
  attributes: {
    visContext: { bar: 'foo' },
    controlGroupState: undefined,
    timeRestore: true,
  },
  globalState: {
    timeRange: { from: 'now-15m', to: 'now' },
    refreshInterval: { pause: false, value: 1000 },
  },
  appState: { columns: ['column2'] },
});

describe('tab mapping utils', () => {
  describe('fromSavedObjectTabToTabState', () => {
    it('should map saved object tab to tab state', () => {
      let tabState = fromSavedObjectTabToTabState({
        tab: fromTabStateToSavedObjectTab({
          tab: tab2,
          overridenTimeRestore: false,
          services,
          currentDataView: undefined,
        }),
        existingTab: tab1,
      });
      expect(tabState).toMatchInlineSnapshot(`
        Object {
          "appState": Object {
            "breakdownField": "",
            "columns": Array [
              "column2",
            ],
            "dataSource": Object {
              "dataViewId": "test-data-view-2",
              "type": "dataView",
            },
            "density": undefined,
            "filters": undefined,
            "grid": Object {},
            "headerRowHeight": undefined,
            "hideAggregatedPreview": undefined,
            "hideChart": false,
            "interval": undefined,
            "query": undefined,
            "rowHeight": undefined,
            "rowsPerPage": undefined,
            "sampleSize": undefined,
            "sort": Array [],
            "viewMode": undefined,
          },
          "attributes": Object {
            "controlGroupState": undefined,
            "timeRestore": false,
            "visContext": Object {
              "bar": "foo",
            },
          },
          "cascadedDocumentsState": Object {
            "availableCascadeGroups": Array [],
            "cascadedDocumentsMap": Object {},
            "selectedCascadeGroups": Array [],
          },
          "dataRequestParams": Object {
            "isSearchSessionRestored": false,
            "searchSessionId": undefined,
            "timeRangeAbsolute": undefined,
            "timeRangeRelative": undefined,
          },
          "duplicatedFromId": "0",
          "esqlVariables": Array [],
          "expandedDoc": undefined,
          "forceFetchOnSelect": false,
          "globalState": Object {
            "refreshInterval": Object {
              "pause": true,
              "value": 500,
            },
            "timeRange": Object {
              "from": "now-7d",
              "to": "now",
            },
          },
          "id": "2",
          "initialInternalState": Object {
            "serializedSearchSource": Object {
              "index": "test-data-view-2",
            },
          },
          "initializationState": Object {
            "initializationStatus": "NotStarted",
          },
          "isDataViewLoading": false,
          "label": "Tab 2",
          "overriddenVisContextAfterInvalidation": undefined,
          "previousAppState": Object {
            "columns": Array [
              "column1",
            ],
          },
          "resetDefaultProfileState": Object {
            "breakdownField": false,
            "columns": false,
            "hideChart": false,
            "resetId": "",
            "rowHeight": false,
          },
          "uiState": Object {},
        }
      `);
      tabState = fromSavedObjectTabToTabState({
        tab: fromTabStateToSavedObjectTab({
          tab: tab2,
          overridenTimeRestore: true,
          services,
          currentDataView: undefined,
        }),
        existingTab: tab1,
      });
      expect(tabState).toMatchInlineSnapshot(`
        Object {
          "appState": Object {
            "breakdownField": "",
            "columns": Array [
              "column2",
            ],
            "dataSource": Object {
              "dataViewId": "test-data-view-2",
              "type": "dataView",
            },
            "density": undefined,
            "filters": undefined,
            "grid": Object {},
            "headerRowHeight": undefined,
            "hideAggregatedPreview": undefined,
            "hideChart": false,
            "interval": undefined,
            "query": undefined,
            "rowHeight": undefined,
            "rowsPerPage": undefined,
            "sampleSize": undefined,
            "sort": Array [],
            "viewMode": undefined,
          },
          "attributes": Object {
            "controlGroupState": undefined,
            "timeRestore": true,
            "visContext": Object {
              "bar": "foo",
            },
          },
          "cascadedDocumentsState": Object {
            "availableCascadeGroups": Array [],
            "cascadedDocumentsMap": Object {},
            "selectedCascadeGroups": Array [],
          },
          "dataRequestParams": Object {
            "isSearchSessionRestored": false,
            "searchSessionId": undefined,
            "timeRangeAbsolute": undefined,
            "timeRangeRelative": undefined,
          },
          "duplicatedFromId": "0",
          "esqlVariables": Array [],
          "expandedDoc": undefined,
          "forceFetchOnSelect": false,
          "globalState": Object {
            "refreshInterval": Object {
              "pause": false,
              "value": 1000,
            },
            "timeRange": Object {
              "from": "now-15m",
              "to": "now",
            },
          },
          "id": "2",
          "initialInternalState": Object {
            "serializedSearchSource": Object {
              "index": "test-data-view-2",
            },
          },
          "initializationState": Object {
            "initializationStatus": "NotStarted",
          },
          "isDataViewLoading": false,
          "label": "Tab 2",
          "overriddenVisContextAfterInvalidation": undefined,
          "previousAppState": Object {
            "columns": Array [
              "column1",
            ],
          },
          "resetDefaultProfileState": Object {
            "breakdownField": false,
            "columns": false,
            "hideChart": false,
            "resetId": "",
            "rowHeight": false,
          },
          "uiState": Object {},
        }
      `);
    });
  });

  describe('fromSavedObjectTabToSavedSearch', () => {
    it('should map saved object tab to saved search', async () => {
      const toolkit = getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewMockWithTimeField],
      });
      const persistedTab = getPersistedTabMock({
        tabId: 'test-tab',
        dataView: dataViewMockWithTimeField,
        services: toolkit.services,
        appStateOverrides: tab1.appState,
        globalStateOverrides: tab1.globalState,
        attributesOverrides: {
          ...tab1.attributes,
          timeRestore: true,
        },
      });
      const persistedDiscoverSession = createDiscoverSessionMock({
        id: 'the-saved-search-id-with-timefield',
        title: 'title',
        description: 'description',
        tabs: [persistedTab],
        managed: true,
        tags: ['tag1', 'tag2'],
      });
      await toolkit.initializeTabs({ persistedDiscoverSession });

      const savedSearch = await fromSavedObjectTabToSavedSearch({
        tab: persistedTab,
        discoverSession: toolkit.internalState.getState().persistedDiscoverSession,
        services: toolkit.services,
      });
      expect(omit(savedSearch, 'searchSource')).toMatchInlineSnapshot(`
        Object {
          "breakdownField": "",
          "chartInterval": "auto",
          "columns": Array [
            "column1",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "description": "description",
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "the-saved-search-id-with-timefield",
          "isTextBasedQuery": false,
          "managed": true,
          "references": undefined,
          "refreshInterval": Object {
            "pause": true,
            "value": 500,
          },
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "sharingSavedObjectProps": undefined,
          "sort": Array [
            Array [
              "@timestamp",
              "desc",
            ],
          ],
          "tags": Array [
            "tag1",
            "tag2",
          ],
          "timeRange": Object {
            "from": "now-7d",
            "to": "now",
          },
          "timeRestore": true,
          "title": "title",
          "usesAdHocDataView": false,
          "viewMode": undefined,
          "visContext": Object {
            "foo": "bar",
          },
        }
      `);
      expect(savedSearch.searchSource.getSerializedFields()).toMatchInlineSnapshot(`
        Object {
          "filter": Array [],
          "index": "the-data-view-id",
          "query": Object {
            "language": "kuery",
            "query": "",
          },
        }
      `);
    });
  });

  describe('fromTabStateToSavedObjectTab', () => {
    it('should map tab state to saved object tab when currentDataView is undefined', () => {
      let savedObjectTab = fromTabStateToSavedObjectTab({
        tab: tab1,
        services,
        currentDataView: undefined,
      });
      expect(savedObjectTab).toMatchInlineSnapshot(`
        Object {
          "breakdownField": "",
          "chartInterval": undefined,
          "columns": Array [
            "column1",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "1",
          "isTextBasedQuery": false,
          "label": "Tab 1",
          "refreshInterval": undefined,
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "serializedSearchSource": Object {
            "index": "test-data-view-1",
          },
          "sort": Array [],
          "timeRange": undefined,
          "timeRestore": false,
          "usesAdHocDataView": false,
          "viewMode": undefined,
          "visContext": Object {
            "foo": "bar",
          },
        }
      `);
      savedObjectTab = fromTabStateToSavedObjectTab({
        tab: tab1,
        overridenTimeRestore: true,
        services,
        currentDataView: undefined,
      });
      expect(savedObjectTab).toMatchInlineSnapshot(`
        Object {
          "breakdownField": "",
          "chartInterval": undefined,
          "columns": Array [
            "column1",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "1",
          "isTextBasedQuery": false,
          "label": "Tab 1",
          "refreshInterval": Object {
            "pause": true,
            "value": 500,
          },
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "serializedSearchSource": Object {
            "index": "test-data-view-1",
          },
          "sort": Array [],
          "timeRange": Object {
            "from": "now-7d",
            "to": "now",
          },
          "timeRestore": true,
          "usesAdHocDataView": false,
          "viewMode": undefined,
          "visContext": Object {
            "foo": "bar",
          },
        }
      `);
    });

    it('should use currentDataView when provided', () => {
      const tabWithAppState = getTabStateMock({
        id: 'initialized-tab',
        label: 'Initialized Tab',
        initialInternalState: {
          // This should NOT be used when dataView is provided
          serializedSearchSource: { index: 'stale-data-view-id' },
        },
        appState: {
          columns: ['@timestamp', 'message'],
          query: { query: 'test query', language: 'kuery' },
          filters: [{ meta: { alias: 'test filter' }, query: { match_all: {} } }],
        },
        globalState: {
          timeRange: { from: 'now-24h', to: 'now' },
        },
      });

      const savedObjectTab = fromTabStateToSavedObjectTab({
        tab: tabWithAppState,
        services,
        currentDataView: dataViewMockWithTimeField,
      });

      // The serializedSearchSource should be created from the provided dataView,
      // NOT from the stale initialInternalState.serializedSearchSource
      // Note: The index is serialized as the dataView ID, not the full dataView object
      expect(savedObjectTab.serializedSearchSource.index).toBe(dataViewMockWithTimeField.id);
      expect(savedObjectTab.serializedSearchSource.query).toEqual({
        query: 'test query',
        language: 'kuery',
      });
      expect(savedObjectTab.serializedSearchSource.filter).toEqual([
        { meta: { alias: 'test filter' }, query: { match_all: {} } },
      ]);
      expect(savedObjectTab.columns).toEqual(['@timestamp', 'message']);
      expect(savedObjectTab.id).toBe('initialized-tab');
      expect(savedObjectTab.label).toBe('Initialized Tab');
      // Verify we're not using the stale data from initialInternalState
      expect(savedObjectTab.serializedSearchSource.index).not.toBe('stale-data-view-id');
    });

    it('should fall back to initialInternalState when currentDataView is undefined', () => {
      const tabWithAppState = getTabStateMock({
        id: 'uninitialized-tab',
        label: 'Uninitialized Tab',
        initialInternalState: {
          serializedSearchSource: { index: 'initial-data-view-id', query: { esql: 'FROM test' } },
        },
      });

      const savedObjectTab = fromTabStateToSavedObjectTab({
        tab: tabWithAppState,
        services,
        currentDataView: undefined,
      });

      // Should use initialInternalState since dataView is not provided
      expect(savedObjectTab.serializedSearchSource).toEqual({
        index: 'initial-data-view-id',
        query: { esql: 'FROM test' },
      });
    });
  });

  describe('fromSavedSearchToSavedObjectTab', () => {
    it('should map saved search to saved object tab considering tab attributes', () => {
      const savedObjectTab = fromSavedSearchToSavedObjectTab({
        tab: tab1,
        savedSearch: { ...savedSearchMock, visContext: { foo: 'bar' } },
        services,
      });
      expect(savedObjectTab).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "chartInterval": undefined,
          "columns": Array [
            "default_column",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "1",
          "isTextBasedQuery": false,
          "label": "Tab 1",
          "refreshInterval": undefined,
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "serializedSearchSource": Object {
            "index": "the-data-view-id",
            "query": Object {
              "language": "kuery",
              "query": "",
            },
          },
          "sort": Array [],
          "timeRange": undefined,
          "timeRestore": false,
          "usesAdHocDataView": undefined,
          "viewMode": undefined,
          "visContext": Object {
            "foo": "bar",
          },
        }
      `);

      const savedObjectTab2 = fromSavedSearchToSavedObjectTab({
        tab: tab2,
        savedSearch: savedSearchMock,
        services,
      });
      expect(savedObjectTab2).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "chartInterval": undefined,
          "columns": Array [
            "default_column",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "2",
          "isTextBasedQuery": false,
          "label": "Tab 2",
          "refreshInterval": Object {
            "pause": false,
            "value": 1000,
          },
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "serializedSearchSource": Object {
            "index": "the-data-view-id",
            "query": Object {
              "language": "kuery",
              "query": "",
            },
          },
          "sort": Array [],
          "timeRange": Object {
            "from": "now-15m",
            "to": "now",
          },
          "timeRestore": true,
          "usesAdHocDataView": undefined,
          "viewMode": undefined,
          "visContext": Object {
            "bar": "foo",
          },
        }
      `);
    });

    it('should map saved search to saved object tab without tab attributes', () => {
      const savedSearch = {
        ...savedSearchMock,
        timeRange: { from: 'now-15m', to: 'now' },
        refreshInterval: { pause: false, value: 1000 },
      };
      const savedObjectTab = fromSavedSearchToSavedObjectTab({
        tab: omit(tab1, 'attributes'),
        savedSearch: { ...savedSearch, timeRestore: false },
        services,
      });
      expect(savedObjectTab).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "chartInterval": undefined,
          "columns": Array [
            "default_column",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "1",
          "isTextBasedQuery": false,
          "label": "Tab 1",
          "refreshInterval": Object {
            "pause": false,
            "value": 1000,
          },
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "serializedSearchSource": Object {
            "index": "the-data-view-id",
            "query": Object {
              "language": "kuery",
              "query": "",
            },
          },
          "sort": Array [],
          "timeRange": Object {
            "from": "now-15m",
            "to": "now",
          },
          "timeRestore": false,
          "usesAdHocDataView": undefined,
          "viewMode": undefined,
          "visContext": undefined,
        }
      `);

      const savedObjectTab2 = fromSavedSearchToSavedObjectTab({
        tab: omit(tab2, 'attributes'),
        savedSearch: { ...savedSearch, timeRestore: true },
        services,
      });
      expect(savedObjectTab2).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "chartInterval": undefined,
          "columns": Array [
            "default_column",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "2",
          "isTextBasedQuery": false,
          "label": "Tab 2",
          "refreshInterval": Object {
            "pause": false,
            "value": 1000,
          },
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "serializedSearchSource": Object {
            "index": "the-data-view-id",
            "query": Object {
              "language": "kuery",
              "query": "",
            },
          },
          "sort": Array [],
          "timeRange": Object {
            "from": "now-15m",
            "to": "now",
          },
          "timeRestore": true,
          "usesAdHocDataView": undefined,
          "viewMode": undefined,
          "visContext": undefined,
        }
      `);
    });
  });
});
