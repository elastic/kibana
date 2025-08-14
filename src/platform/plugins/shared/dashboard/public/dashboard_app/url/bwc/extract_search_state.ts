/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardState, migrateLegacyQuery } from '../../../../common';

type DashboardSearchState = Pick<
  DashboardState,
  'filters' | 'query' | 'refreshInterval' | 'timeRange'
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
    searchState.refreshInterval = state.refreshInterval as DashboardState['refreshInterval'];
  }

  if (state.timeRange && typeof state.timeRange === 'object') {
    searchState.timeRange = state.timeRange as DashboardState['timeRange'];
  }

  return searchState;
}
