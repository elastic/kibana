/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { DEFAULT_COLUMNS_SETTING } from '@kbn/discover-utils';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';

/**
 * Normalizes `_source` (Summary) when loading app/URL column state.
 * Preserves mixed field + Summary lists so coexistence survives reload;
 * collapses sole `_source` to classic summary-only (`[]`);
 * fills empty columns from defaultColumns (except the classic `['_source']` sentinel).
 */
export function handleSourceColumnState<TState extends { columns?: string[] }>(
  state: TState,
  uiSettings: IUiSettingsClient
): TState {
  if (!state.columns) {
    return state;
  }

  // At least one real field: keep `_source` if present (user/profile enabled Summary)
  if (state.columns.some((column) => column !== SOURCE_COLUMN)) {
    return state;
  }

  // Sole `_source` from URL/session: collapse to classic summary-only
  if (state.columns.length > 0) {
    return {
      ...state,
      columns: [],
    };
  }

  // Empty columns: apply configured defaults. Classic Discover uses `['_source']` to mean
  // summary-only view, not a pinned Summary column — keep that as `[]`.
  const defaultColumns: string[] = uiSettings.get(DEFAULT_COLUMNS_SETTING);
  if (isEqual(defaultColumns, [SOURCE_COLUMN])) {
    return {
      ...state,
      columns: [],
    };
  }

  return {
    ...state,
    columns: defaultColumns,
  };
}
