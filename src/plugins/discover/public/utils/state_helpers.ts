/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { DEFAULT_COLUMNS_SETTING } from '@kbn/discover-utils';

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
  const defaultColumns = uiSettings.get(DEFAULT_COLUMNS_SETTING);

  // filter out the source column
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
}
