/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataView, type DataViewField } from '@kbn/data-views-plugin/common';
import { getDataViewFieldList } from './get_data_view_field_list';

export enum DiscoverSidebarReducerActionType {
  RESET = 'RESET',
  DATA_VIEW_SWITCHED = 'DATA_VIEW_SWITCHED',
  DOCUMENTS_LOADED = 'DOCUMENTS_LOADED',
  DOCUMENTS_LOADING = 'DOCUMENTS_LOADING',
}

type DiscoverSidebarReducerAction =
  | {
      type: DiscoverSidebarReducerActionType.RESET;
      payload: {
        dataView: DataView | null | undefined;
      };
    }
  | {
      type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED;
      payload: {
        dataView: DataView | null | undefined;
      };
    }
  | {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING;
      payload: {
        isPlainRecord: boolean;
      };
    }
  | {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED;
      payload: {
        fieldCounts: DiscoverSidebarReducerState['fieldCounts'];
        isPlainRecord: boolean;
        dataView: DataView | null | undefined;
      };
    };

export enum DiscoverSidebarReducerStatus {
  INITIAL = 'INITIAL',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export interface DiscoverSidebarReducerState {
  dataView: DataView | null | undefined;
  allFields: DataViewField[] | null;
  fieldCounts: Record<string, number> | null;
  status: DiscoverSidebarReducerStatus;
}

export function getInitialState(dataView?: DataView | null): DiscoverSidebarReducerState {
  return {
    dataView,
    allFields: null,
    fieldCounts: null,
    status: DiscoverSidebarReducerStatus.INITIAL,
  };
}

export function discoverSidebarReducer(
  state: DiscoverSidebarReducerState,
  action: DiscoverSidebarReducerAction
): DiscoverSidebarReducerState {
  console.log('*** discoverSidebarReducer');
  switch (action.type) {
    case DiscoverSidebarReducerActionType.RESET:
      // empties field info
      return getInitialState(action.payload.dataView);
    case DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED:
      // checks if data view is the same, otherwise empties field info
      return state.dataView === action.payload.dataView
        ? state // already updated in `DOCUMENTS_LOADED`
        : {
            ...state,
            dataView: action.payload.dataView,
            fieldCounts: null,
            allFields: null,
            status:
              state.status === DiscoverSidebarReducerStatus.COMPLETED
                ? DiscoverSidebarReducerStatus.INITIAL
                : state.status,
          };
    case DiscoverSidebarReducerActionType.DOCUMENTS_LOADING:
      // has a list of fields
      return {
        ...state,
        fieldCounts: null,
        // what is this?
        allFields: action.payload.isPlainRecord ? null : state.allFields,
        status: DiscoverSidebarReducerStatus.PROCESSING,
      };
    case DiscoverSidebarReducerActionType.DOCUMENTS_LOADED:
      // todo this
      const mappedAndUnmappedFields = getDataViewFieldList(
        action.payload.dataView,
        action.payload.fieldCounts, // this is what it was waiting for
        action.payload.isPlainRecord
      );
      return {
        ...state,
        dataView: action.payload.dataView,
        fieldCounts: action.payload.fieldCounts,
        allFields: mappedAndUnmappedFields,
        status:
          mappedAndUnmappedFields === null
            ? DiscoverSidebarReducerStatus.PROCESSING
            : DiscoverSidebarReducerStatus.COMPLETED,
      };
  }

  return state;
}
