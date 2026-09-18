/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataView, type DataViewField } from '@kbn/data-views-plugin/common';
import type { DataSource } from '@kbn/data-source';
import { getDataViewFieldList, getEsqlQueryFieldList } from './get_field_list';

export enum DiscoverSidebarReducerActionType {
  RESET = 'RESET',
  DATA_VIEW_SWITCHED = 'DATA_VIEW_SWITCHED',
  DOCUMENTS_LOADED = 'DOCUMENTS_LOADED',
  DOCUMENTS_LOADING = 'DOCUMENTS_LOADING',
}

type DiscoverSidebarReducerAction =
  | {
      type: DiscoverSidebarReducerActionType.RESET;
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
        dataSource: DataSource | undefined;
      };
    }
  | {
      type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED;
      payload: {
        dataSource: DataSource | undefined;
        fieldCounts: DiscoverSidebarReducerState['fieldCounts'];
        /**
         * Classic fallback when `documents$` has no DataSource yet (error / first load).
         * Not stored — UnifiedFieldList still receives `props.selectedDataView`.
         */
        fallbackDataView?: DataView | null;
      };
    };

export enum DiscoverSidebarReducerStatus {
  INITIAL = 'INITIAL',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export interface DiscoverSidebarReducerState {
  dataSource: DataSource | undefined;
  allFields: DataViewField[] | null;
  fieldCounts: Record<string, number> | null;
  status: DiscoverSidebarReducerStatus;
}

export function getInitialState(): DiscoverSidebarReducerState {
  return {
    dataSource: undefined,
    allFields: null,
    fieldCounts: null,
    status: DiscoverSidebarReducerStatus.INITIAL,
  };
}

/**
 * Field list after a fetch completes. ES|QL uses `resultColumns` (keeps `isNull`).
 * Classic uses the DataView plus hit counts for unmapped fields.
 */
function getSidebarAllFields(
  dataSource: DataSource | undefined,
  fieldCounts: Record<string, number> | null,
  fallbackDataView?: DataView | null
): DataViewField[] | null {
  if (dataSource?.kind === 'esql') {
    return getEsqlQueryFieldList(dataSource.resultColumns);
  }
  const dataView =
    dataSource?.kind === 'index-pattern' ? dataSource.getDataView() : fallbackDataView;
  return getDataViewFieldList(dataView, fieldCounts);
}

/**
 * Field list during fetch. Not the same as {@link getSidebarAllFields}: Classic
 * `fieldCounts` are cleared on LOADING, so rebuilding would flash an empty sidebar.
 */
function getAllFieldsWhileLoading(
  previous: DataSource | undefined,
  next: DataSource | undefined,
  previousAllFields: DataViewField[] | null
): DataViewField[] | null {
  if (next?.kind === 'esql') {
    return getEsqlQueryFieldList(next.resultColumns);
  }
  if (next?.kind === 'index-pattern' && previous?.kind !== 'esql') {
    return previousAllFields;
  }
  return null;
}

export function discoverSidebarReducer(
  state: DiscoverSidebarReducerState,
  action: DiscoverSidebarReducerAction
): DiscoverSidebarReducerState {
  switch (action.type) {
    case DiscoverSidebarReducerActionType.RESET:
      return getInitialState();
    case DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED: {
      if (state.dataSource?.kind === 'esql') {
        // Shim DataView registration after ES|QL fetch is not a user switch.
        return state;
      }
      if (
        state.dataSource?.kind === 'index-pattern' &&
        state.dataSource.getDataView() === action.payload.dataView
      ) {
        return state;
      }
      return {
        ...state,
        fieldCounts: null,
        allFields: null,
        status:
          state.status === DiscoverSidebarReducerStatus.COMPLETED
            ? DiscoverSidebarReducerStatus.INITIAL
            : state.status,
      };
    }
    case DiscoverSidebarReducerActionType.DOCUMENTS_LOADING: {
      const { dataSource } = action.payload;
      return {
        ...state,
        dataSource,
        fieldCounts: null,
        allFields: getAllFieldsWhileLoading(state.dataSource, dataSource, state.allFields),
        status: DiscoverSidebarReducerStatus.PROCESSING,
      };
    }
    case DiscoverSidebarReducerActionType.DOCUMENTS_LOADED: {
      const { dataSource, fieldCounts, fallbackDataView } = action.payload;
      const allFields = getSidebarAllFields(dataSource, fieldCounts, fallbackDataView);
      return {
        ...state,
        dataSource,
        fieldCounts,
        allFields,
        status:
          allFields === null
            ? DiscoverSidebarReducerStatus.PROCESSING
            : DiscoverSidebarReducerStatus.COMPLETED,
      };
    }
  }

  return state;
}
