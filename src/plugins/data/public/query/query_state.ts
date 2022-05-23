/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryState } from '../../common';
import type { TimefilterSetup } from './timefilter';
import type { FilterManager } from './filter_manager';
import type { QueryStringContract } from './query_string';

export type { QueryState };

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
