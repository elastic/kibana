/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  stubDataViewWithoutTimeField,
  stubLogstashDataView as dataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import type { DiscoverSidebarReducerState } from './sidebar_reducer';
import {
  discoverSidebarReducer,
  DiscoverSidebarReducerActionType,
  DiscoverSidebarReducerStatus,
  getInitialState,
} from './sidebar_reducer';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';

describe('sidebar reducer', function () {
  it('should set an initial state', function () {
    expect(getInitialState()).toEqual({
      dataSource: undefined,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.INITIAL,
    });
  });

  it('should handle "documents loading" action', function () {
    const dataViewSource = new DataViewSource(dataView);
    const state: DiscoverSidebarReducerState = {
      ...getInitialState(),
      dataSource: dataViewSource,
      allFields: [dataView.fields[0]],
    };

    // DataView → DataView: keep allFields to avoid a loading flash
    const resultForDocuments = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
      payload: {
        dataSource: dataViewSource,
      },
    });
    expect(resultForDocuments).toEqual(
      expect.objectContaining({
        dataSource: dataViewSource,
        allFields: state.allFields,
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      })
    );

    // No source yet (first load): clear allFields
    const resultForNoSource = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
      payload: {
        dataSource: undefined,
      },
    });
    expect(resultForNoSource).toEqual(
      expect.objectContaining({
        dataSource: undefined,
        allFields: null,
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      })
    );

    // ES|QL fetch: populate allFields immediately from resultColumns
    const esqlSource = createMockEsqlSource(
      [],
      [{ id: '1', name: 'AVG(bytes)', meta: { type: 'number' } }]
    );
    const resultForEsqlQuery = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
      payload: {
        dataSource: esqlSource,
      },
    });
    expect(resultForEsqlQuery).toEqual(
      expect.objectContaining({
        dataSource: esqlSource,
        allFields: expect.arrayContaining([expect.objectContaining({ name: 'AVG(bytes)' })]),
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      })
    );

    // ES|QL → DataView transition: clear allFields
    const esqlState: DiscoverSidebarReducerState = {
      ...state,
      dataSource: esqlSource,
      allFields: [dataView.fields[0]], // stale ES|QL columns
    };
    const resultForEsqlToDataView = discoverSidebarReducer(esqlState, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
      payload: {
        dataSource: dataViewSource,
      },
    });
    expect(resultForEsqlToDataView).toEqual(
      expect.objectContaining({
        dataSource: dataViewSource,
        allFields: null,
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      })
    );
  });

  it('should handle "documents loaded" action', function () {
    const dataViewFieldName = stubDataViewWithoutTimeField.fields[0].name;
    const unmappedFieldName = 'field1';
    const fieldCounts = { [unmappedFieldName]: 1, [dataViewFieldName]: 1 };
    const state: DiscoverSidebarReducerState = getInitialState();
    const dataViewSource = new DataViewSource(stubDataViewWithoutTimeField);
    const resultForDocuments = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        dataSource: dataViewSource,
        fieldCounts,
      },
    });
    expect(resultForDocuments).toStrictEqual({
      dataSource: dataViewSource,
      allFields: [
        ...stubDataViewWithoutTimeField.fields,
        // merging in unmapped fields
        new DataViewField({
          name: unmappedFieldName,
          type: 'unknown',
          aggregatable: false,
          searchable: false,
        }),
      ],
      fieldCounts,
      status: DiscoverSidebarReducerStatus.COMPLETED,
    });

    const esqlSource = createMockEsqlSource(
      [],
      [
        {
          id: '1',
          name: 'text1',
          meta: { type: 'number' },
          isNull: true,
        },
        {
          id: '2',
          name: 'text2',
          meta: { type: 'string', esType: 'keyword' },
        },
      ]
    );
    const resultForEsqlQuery = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        dataSource: esqlSource,
        fieldCounts: {},
      },
    });
    expect(resultForEsqlQuery).toStrictEqual({
      dataSource: esqlSource,
      allFields: [
        new DataViewField({
          name: 'text1',
          type: 'number',
          esTypes: undefined,
          aggregatable: false,
          isNull: true,
          isComputedColumn: false,
          searchable: true,
        }),
        new DataViewField({
          name: 'text2',
          type: 'string',
          esTypes: ['keyword'],
          isComputedColumn: false,
          aggregatable: false,
          isNull: false,
          searchable: true,
        }),
      ],
      fieldCounts: {},
      status: DiscoverSidebarReducerStatus.COMPLETED,
    });

    const dataViewSource2 = new DataViewSource(stubDataViewWithoutTimeField);
    const resultWhileLoading = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        dataSource: dataViewSource2,
        fieldCounts: null,
      },
    });
    expect(resultWhileLoading).toStrictEqual({
      dataSource: dataViewSource2,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.PROCESSING,
    });
  });

  it('uses fallbackDataView when Classic documents loaded have no dataSource', function () {
    const fieldCounts = { [dataView.fields[0].name]: 1 };
    const result = discoverSidebarReducer(getInitialState(), {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        dataSource: undefined,
        fieldCounts,
        fallbackDataView: dataView,
      },
    });
    expect(result.allFields).toEqual(expect.arrayContaining([dataView.fields[0]]));
    expect(result.status).toBe(DiscoverSidebarReducerStatus.COMPLETED);
  });

  it('should handle "data view switched" action', function () {
    const state: DiscoverSidebarReducerState = getInitialState();
    const dataViewSource = new DataViewSource(dataView);

    const loadedState = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        dataSource: dataViewSource,
        fieldCounts: {},
      },
    });
    const resultForTheSameDataView = discoverSidebarReducer(loadedState, {
      type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
      payload: {
        dataView,
      },
    });
    expect(resultForTheSameDataView).toBe(loadedState);

    const resultForAnotherDataView = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
      payload: {
        dataView: stubDataViewWithoutTimeField,
      },
    });
    expect(resultForAnotherDataView).toStrictEqual({
      dataSource: undefined,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.INITIAL,
    });

    const resultForAnotherDataViewAfterProcessing = discoverSidebarReducer(
      {
        ...state,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      },
      {
        type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
        payload: {
          dataView: stubDataViewWithoutTimeField,
        },
      }
    );
    expect(resultForAnotherDataViewAfterProcessing).toStrictEqual({
      dataSource: undefined,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.PROCESSING,
    });

    const resultForAnotherDataViewAfterCompleted = discoverSidebarReducer(
      {
        ...state,
        status: DiscoverSidebarReducerStatus.COMPLETED,
      },
      {
        type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
        payload: {
          dataView: stubDataViewWithoutTimeField,
        },
      }
    );
    expect(resultForAnotherDataViewAfterCompleted).toStrictEqual({
      dataSource: undefined,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.INITIAL,
    });

    // In ES|QL mode the DataView change (synthetic DataView registered after fetch) should not
    // clear the field list — it was just populated by DOCUMENTS_LOADED from the query result.
    const esqlSource = createMockEsqlSource(
      [],
      [{ id: '1', name: 'col1', meta: { type: 'number' } }]
    );
    const esqlAllFields = [dataView.fields[0]];
    const esqlState: DiscoverSidebarReducerState = {
      ...state,
      dataSource: esqlSource,
      allFields: esqlAllFields,
      status: DiscoverSidebarReducerStatus.COMPLETED,
    };
    const resultForEsqlDataViewSwitch = discoverSidebarReducer(esqlState, {
      type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
      payload: {
        dataView: stubDataViewWithoutTimeField,
      },
    });
    expect(resultForEsqlDataViewSwitch).toBe(esqlState);
  });

  it('should handle "reset" action', function () {
    const state: DiscoverSidebarReducerState = {
      ...getInitialState(),
      allFields: [dataView.fields[0]],
      fieldCounts: {},
      status: DiscoverSidebarReducerStatus.COMPLETED,
    };
    const resultForDocuments = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.RESET,
    });
    expect(resultForDocuments).toEqual(getInitialState());
  });
});
