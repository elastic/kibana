/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, RefreshInterval, TimeRange, Query } from '../../../common';

/**
 * All query state service state
 */
export interface QueryState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
  query?: Query;
}

type QueryStateChangePartial = {
  [P in keyof QueryState]?: boolean;
};

export interface QueryStateChange extends QueryStateChangePartial {
  appFilters?: boolean; // specifies if app filters change
  globalFilters?: boolean; // specifies if global filters change
}
