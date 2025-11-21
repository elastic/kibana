/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../../../common';
import { migrateLegacyQuery } from '../../../../common';

type DashboardSearchState = Pick<
  DashboardState,
  'filters' | 'query' | 'refresh_interval' | 'time_range'
>;

export function extractSearchState(state: {
  [key: string]: unknown;
}): Partial<DashboardSearchState> {
  const searchState: Partial<DashboardSearchState> = {};

  if (Array.isArray(state.filters)) {
    searchState.filters = state.filters;
  }

  if (state.query && typeof state.query === 'object') {
    searchState.query = migrateLegacyQuery(state.query);
  }

  if (state.refreshInterval && typeof state.refreshInterval === 'object') {
    searchState.refresh_interval = state.refreshInterval as DashboardState['refresh_interval'];
  }

  if (state.timeRange && typeof state.timeRange === 'object') {
    searchState.time_range = state.timeRange as DashboardState['time_range'];
  }

  return searchState;
}
