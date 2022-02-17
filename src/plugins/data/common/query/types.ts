/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Query, Filter } from '@kbn/es-query';
import type { RefreshInterval, TimeRange } from './timefilter/types';

export type { RefreshInterval, TimeRange, TimeRangeBounds } from './timefilter/types';
export type { Query } from '@kbn/es-query';

export type SavedQueryTimeFilter = TimeRange & {
  refreshInterval: RefreshInterval;
};

export interface SavedQuery {
  id: string;
  attributes: SavedQueryAttributes;
}

export interface SavedQueryAttributes {
  title: string;
  description: string;
  query: Query;
  filters?: Filter[];
  timefilter?: SavedQueryTimeFilter;
}
