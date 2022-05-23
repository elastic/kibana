/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import type { TimefilterSetup } from './timefilter';
import type { FilterManager } from './filter_manager';
import type { QueryStringContract } from './query_string';
import type { RefreshInterval, TimeRange, Query } from '../../common';

/**
 * All query state service state
 */
export interface QueryState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
  query?: Query;
}

export function getQueryState({
  timefilter: { timefilter },
  filterManager,
  queryString,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
  queryString: QueryStringContract;
}): QueryState {
  return {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getFilters(),
    query: queryString.getQuery(),
  };
}
