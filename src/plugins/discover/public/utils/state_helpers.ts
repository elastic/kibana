/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';
import { isEqual } from 'lodash';
import { SEARCH_FIELDS_FROM_SOURCE, DEFAULT_COLUMNS_SETTING } from '../../common';

/**
 * Makes sure the current state is not referencing the source column when using the fields api
 * @param state
 * @param uiSettings
 */
export function handleSourceColumnState<TState extends { columns?: string[] }>(
  state: TState,
  uiSettings: IUiSettingsClient
): TState {
  if (!state.columns) {
    return state;
  }
  const useNewFieldsApi = !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE);
  const defaultColumns = uiSettings.get(DEFAULT_COLUMNS_SETTING);

  if (useNewFieldsApi) {
    // if fields API is used, filter out the source column
    let cleanedColumns = state.columns.filter((column) => column !== '_source');
    if (cleanedColumns.length === 0 && !isEqual(defaultColumns, ['_source'])) {
      cleanedColumns = defaultColumns;
      // defaultColumns could still contain _source
      cleanedColumns = cleanedColumns.filter((column) => column !== '_source');
    }
    return {
      ...state,
      columns: cleanedColumns,
    };
  } else if (state.columns.length === 0) {
    // if _source fetching is used and there are no column, switch back to default columns
    // this can happen if the fields API was previously used
    const columns = defaultColumns;
    if (columns.length === 0) {
      columns.push('_source');
    }
    return {
      ...state,
      columns: [...columns],
    };
  }

  return state;
}
