/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import type { TimeRange, RefreshInterval } from './timefilter/types';
import type { Query, AggregateQuery } from './types';

/**
 * All query state service state
 *
 * @remark
 * `type` instead of `interface` to make it compatible with PersistableState utils
 *
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QueryState = {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
  query?: Query | AggregateQuery;
};
