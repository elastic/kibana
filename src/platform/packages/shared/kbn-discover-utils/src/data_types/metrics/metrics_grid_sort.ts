/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export type MetricsGridSortField = 'alphabetically' | 'recency';

export type MetricsGridSortDirection = 'asc' | 'desc';

export interface MetricsGridSort extends SerializableRecord {
  sortField: MetricsGridSortField;
  sortDirection: MetricsGridSortDirection;
}

export const METRICS_GRID_SORT_DEFAULTS: MetricsGridSort = {
  sortField: 'alphabetically',
  sortDirection: 'asc',
};
