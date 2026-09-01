/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { DEFAULT_COLUMNS_SETTING } from '@kbn/discover-utils';

/**
 * Uses app/URL columns when present, otherwise falling back to the configured default columns.
 */
export function handleSourceColumnState<TState extends { columns?: string[] }>(
  state: TState,
  uiSettings: IUiSettingsClient
): TState {
  return !state.columns || state.columns.length > 0
    ? state
    : { ...state, columns: uiSettings.get(DEFAULT_COLUMNS_SETTING) };
}
