/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { SEARCH_FIELDS_FROM_SOURCE, DEFAULT_COLUMNS_SETTING } from '@kbn/discover-utils';
import { hasOnlySourceColumn } from '@kbn/unified-data-table/src/utils/columns';

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
    return {
      ...state,
      columns:
        state.columns.length && !hasOnlySourceColumn(state.columns)
          ? state.columns
          : defaultColumns,
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
