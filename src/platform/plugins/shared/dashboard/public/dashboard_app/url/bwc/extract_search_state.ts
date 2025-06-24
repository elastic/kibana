/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange } from '@kbn/es-query';
import { DashboardState } from '../../../../common';
import { migrateLegacyQuery } from '../../../services/dashboard_content_management_service/lib/load_dashboard_state';

type DashboardSearchState = Pick<
  DashboardState,
  'filters' | 'query' | 'refreshInterval' | 'timeFrom' | 'timeTo'
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
    searchState.timeFrom = (state.timeRange as TimeRange).from;
    searchState.timeTo = (state.timeRange as TimeRange).to;
  } else if (
    state.timeFrom &&
    state.timeTo &&
    typeof state.timeFrom === 'string' &&
    typeof state.timeTo === 'string'
  ) {
    searchState.timeFrom = state.timeFrom;
    searchState.timeTo = state.timeTo;
  }

  return searchState;
}
