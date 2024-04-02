/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  stubDataViewWithoutTimeField,
  stubLogstashDataView as dataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import {
  discoverSidebarReducer,
  DiscoverSidebarReducerActionType,
  DiscoverSidebarReducerState,
  DiscoverSidebarReducerStatus,
  getInitialState,
} from './sidebar_reducer';
import { DataViewField } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';

describe('sidebar reducer', function () {
  it('should set an initial state', function () {
    expect(getInitialState(dataView)).toEqual(
      expect.objectContaining({
        dataView,
        allFields: null,
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.INITIAL,
      })
    );
  });

  it('should handle "documents loading" action', function () {
    const state: DiscoverSidebarReducerState = {
      ...getInitialState(dataView),
      allFields: [dataView.fields[0]],
    };
    const resultForDocuments = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
      payload: {
        isPlainRecord: false,
      },
    });
    expect(resultForDocuments).toEqual(
      expect.objectContaining({
        dataView,
        allFields: state.allFields,
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      })
    );
    const resultForTextBasedQuery = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING,
      payload: {
        isPlainRecord: true,
      },
    });
    expect(resultForTextBasedQuery).toEqual(
      expect.objectContaining({
        dataView,
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
    const state: DiscoverSidebarReducerState = getInitialState(dataView);
    const resultForDocuments = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        isPlainRecord: false,
        dataView: stubDataViewWithoutTimeField,
        fieldCounts,
      },
    });
    expect(resultForDocuments).toStrictEqual({
      dataView: stubDataViewWithoutTimeField,
      allFields: [
        ...stubDataViewWithoutTimeField.fields,
        // merging in unmapped fields
        new DataViewField(
          {
            name: unmappedFieldName,
            type: 'unknown',
            aggregatable: false,
            searchable: false,
          },
          undefined
        ),
      ],
      fieldCounts,
      status: DiscoverSidebarReducerStatus.COMPLETED,
    });

    const resultForTextBasedQuery = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        isPlainRecord: true,
        dataView: stubDataViewWithoutTimeField,
        fieldCounts: {},
        textBasedQueryColumns: [
          {
            id: '1',
            name: 'text1',
            meta: {
              type: 'number',
            },
            isNull: true,
          },
          {
            id: '2',
            name: 'text2',
            meta: {
              type: 'string',
              esType: 'keyword',
            },
          },
        ] as DatatableColumn[],
      },
    });
    expect(resultForTextBasedQuery).toStrictEqual({
      dataView: stubDataViewWithoutTimeField,
      allFields: [
        new DataViewField({
          name: 'text1',
          type: 'number',
          esTypes: undefined,
          aggregatable: false,
          isNull: true,
          searchable: false,
        }),
        new DataViewField({
          name: 'text2',
          type: 'string',
          esTypes: ['keyword'],
          aggregatable: false,
          isNull: false,
          searchable: false,
        }),
      ],
      fieldCounts: {},
      status: DiscoverSidebarReducerStatus.COMPLETED,
    });

    const resultWhileLoading = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED,
      payload: {
        isPlainRecord: false,
        dataView: stubDataViewWithoutTimeField,
        fieldCounts: null,
      },
    });
    expect(resultWhileLoading).toStrictEqual({
      dataView: stubDataViewWithoutTimeField,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.PROCESSING,
    });
  });

  it('should handle "data view switched" action', function () {
    const state: DiscoverSidebarReducerState = getInitialState(dataView);
    const resultForTheSameDataView = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
      payload: {
        dataView: state.dataView,
      },
    });
    expect(resultForTheSameDataView).toBe(state);

    const resultForAnotherDataView = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED,
      payload: {
        dataView: stubDataViewWithoutTimeField,
      },
    });
    expect(resultForAnotherDataView).toStrictEqual({
      dataView: stubDataViewWithoutTimeField,
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
      dataView: stubDataViewWithoutTimeField,
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
      dataView: stubDataViewWithoutTimeField,
      allFields: null,
      fieldCounts: null,
      status: DiscoverSidebarReducerStatus.INITIAL,
    });
  });

  it('should handle "reset" action', function () {
    const state: DiscoverSidebarReducerState = {
      ...getInitialState(dataView),
      allFields: [dataView.fields[0]],
      fieldCounts: {},
      status: DiscoverSidebarReducerStatus.COMPLETED,
    };
    const resultForDocuments = discoverSidebarReducer(state, {
      type: DiscoverSidebarReducerActionType.RESET,
      payload: {
        dataView: stubDataViewWithoutTimeField,
      },
    });
    expect(resultForDocuments).toEqual(
      expect.objectContaining({
        dataView: stubDataViewWithoutTimeField,
        allFields: null,
        fieldCounts: null,
        status: DiscoverSidebarReducerStatus.INITIAL,
      })
    );
  });
});
