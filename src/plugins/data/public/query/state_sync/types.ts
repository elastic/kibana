/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { QueryState } from '../query_state';
import { RefreshInterval, TimeRange } from '../../../common/types';

type QueryStateChangePartial = {
  [P in keyof QueryState]?: boolean;
};

export interface QueryStateChange extends QueryStateChangePartial {
  appFilters?: boolean; // specifies if app filters change
  globalFilters?: boolean; // specifies if global filters change
}

/**
 * Part of {@link QueryState} serialized in the `_g` portion of Url
 */
export interface GlobalQueryStateFromUrl {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
}
