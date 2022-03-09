/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Capabilities, IUiSettingsClient } from 'kibana/public';
import { SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import {
  AppState as DiscoverState,
  GetStateReturn as DiscoverGetStateReturn,
} from '../../../application/main/services/discover_state';
import {
  AppState as ContextState,
  GetStateReturn as ContextGetStateReturn,
} from '../../../application/context/services/context_state';
import { DataViewsContract } from '../../../../../data/public';
import { DataView } from '../../../../../data_views/public';
import { popularizeField } from '../../../utils/popularize_field';

/**
 * Helper function to provide a fallback to a single _source column if the given array of columns
 * is empty, and removes _source if there are more than 1 columns given
 * @param columns
 * @param useNewFieldsApi should a new fields API be used
 */
function buildColumns(columns: string[], useNewFieldsApi = false) {
  if (columns.length > 1 && columns.indexOf('_source') !== -1) {
    return columns.filter((col) => col !== '_source');
  } else if (columns.length !== 0) {
    return columns;
  }
  return useNewFieldsApi ? [] : ['_source'];
}

export function addColumn(columns: string[], columnName: string, useNewFieldsApi?: boolean) {
  if (columns.includes(columnName)) {
    return columns;
  }
  return buildColumns([...columns, columnName], useNewFieldsApi);
}

export function removeColumn(columns: string[], columnName: string, useNewFieldsApi?: boolean) {
  if (!columns.includes(columnName)) {
    return columns;
  }
  return buildColumns(
    columns.filter((col) => col !== columnName),
    useNewFieldsApi
  );
}

export function moveColumn(columns: string[], columnName: string, newIndex: number) {
  if (newIndex < 0 || newIndex >= columns.length || !columns.includes(columnName)) {
    return columns;
  }
  const modifiedColumns = [...columns];
  modifiedColumns.splice(modifiedColumns.indexOf(columnName), 1); // remove at old index
  modifiedColumns.splice(newIndex, 0, columnName); // insert before new index
  return modifiedColumns;
}

export function getStateColumnActions({
  capabilities,
  config,
  indexPattern,
  indexPatterns,
  useNewFieldsApi,
  setAppState,
  state,
}: {
  capabilities: Capabilities;
  config: IUiSettingsClient;
  indexPattern: DataView;
  indexPatterns: DataViewsContract;
  useNewFieldsApi: boolean;
  setAppState: DiscoverGetStateReturn['setAppState'] | ContextGetStateReturn['setAppState'];
  state: DiscoverState | ContextState;
}) {
  function onAddColumn(columnName: string) {
    popularizeField(indexPattern, columnName, indexPatterns, capabilities);
    const columns = addColumn(state.columns || [], columnName, useNewFieldsApi);
    const defaultOrder = config.get(SORT_DEFAULT_ORDER_SETTING);
    const sort =
      columnName === '_score' && !state.sort?.length ? [['_score', defaultOrder]] : state.sort;
    setAppState({ columns, sort });
  }

  function onRemoveColumn(columnName: string) {
    popularizeField(indexPattern, columnName, indexPatterns, capabilities);
    const columns = removeColumn(state.columns || [], columnName, useNewFieldsApi);
    // The state's sort property is an array of [sortByColumn,sortDirection]
    const sort =
      state.sort && state.sort.length
        ? state.sort.filter((subArr) => subArr[0] !== columnName)
        : [];
    setAppState({ columns, sort });
  }

  function onMoveColumn(columnName: string, newIndex: number) {
    const columns = moveColumn(state.columns || [], columnName, newIndex);
    setAppState({ columns });
  }

  function onSetColumns(columns: string[], hideTimeColumn: boolean) {
    // The next line should gone when classic table will be removed
    const actualColumns =
      !hideTimeColumn && indexPattern.timeFieldName && indexPattern.timeFieldName === columns[0]
        ? columns.slice(1)
        : columns;

    setAppState({ columns: actualColumns });
  }
  return {
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
}
