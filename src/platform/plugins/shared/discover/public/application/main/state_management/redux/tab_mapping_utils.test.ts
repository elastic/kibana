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
import { getTabStateMock } from './__mocks__/internal_state.mocks';
import {
  fromSavedObjectTabToTabState,
  fromSavedObjectTabToSavedSearch,
  fromTabStateToSavedObjectTab,
  fromSavedSearchToSavedObjectTab,
} from './tab_mapping_utils';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';

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
        tab: fromTabStateToSavedObjectTab({ tab: tab2, overridenTimeRestore: false, services }),
        existingTab: tab1,
      });
      expect(tabState).toMatchInlineSnapshot(`
        Object {
          "appState": Object {
            "breakdownField": undefined,
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
        tab: fromTabStateToSavedObjectTab({ tab: tab2, overridenTimeRestore: true, services }),
        existingTab: tab1,
      });
      expect(tabState).toMatchInlineSnapshot(`
        Object {
          "appState": Object {
            "breakdownField": undefined,
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
      const stateContainer = getDiscoverStateMock({ services });
      const savedSearch = await fromSavedObjectTabToSavedSearch({
        tab: fromTabStateToSavedObjectTab({
          tab: tab1,
          services,
        }),
        discoverSession: stateContainer.internalState.getState().persistedDiscoverSession!,
        services,
      });
      expect(savedSearch).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "chartInterval": undefined,
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
          "managed": undefined,
          "references": undefined,
          "refreshInterval": undefined,
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "searchSource": Object {
            "create": [MockFunction],
            "createChild": [MockFunction],
            "createCopy": [MockFunction],
            "destroy": [MockFunction],
            "fetch": [MockFunction],
            "fetch$": [MockFunction],
            "getActiveIndexFilter": [MockFunction],
            "getField": [MockFunction],
            "getFields": [MockFunction],
            "getId": [MockFunction],
            "getOwnField": [MockFunction],
            "getParent": [MockFunction],
            "getSearchRequestBody": [MockFunction],
            "getSerializedFields": [MockFunction],
            "history": Array [],
            "loadDataViewFields": [MockFunction],
            "onRequestStart": [MockFunction],
            "parseActiveIndexPatternFromQueryString": [MockFunction],
            "removeField": [MockFunction],
            "serialize": [MockFunction],
            "setField": [MockFunction],
            "setOverwriteDataViewType": [MockFunction],
            "setParent": [MockFunction],
            "toExpressionAst": [MockFunction],
          },
          "sharingSavedObjectProps": undefined,
          "sort": Array [],
          "tags": undefined,
          "timeRange": undefined,
          "timeRestore": false,
          "title": "title",
          "usesAdHocDataView": false,
          "viewMode": undefined,
          "visContext": Object {
            "foo": "bar",
          },
        }
      `);
    });
  });

  describe('fromTabStateToSavedObjectTab', () => {
    it('should map tab state to saved object tab', () => {
      let savedObjectTab = fromTabStateToSavedObjectTab({
        tab: tab1,
        services,
      });
      expect(savedObjectTab).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
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
      });
      expect(savedObjectTab).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
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
