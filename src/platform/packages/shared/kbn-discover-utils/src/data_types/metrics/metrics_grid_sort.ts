/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export const METRICS_GRID_SORT_FIELDS = ['alphabetically', 'recency'] as const;

export type MetricsGridSortField = (typeof METRICS_GRID_SORT_FIELDS)[number];

export const METRICS_GRID_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type MetricsGridSortDirection = (typeof METRICS_GRID_SORT_DIRECTIONS)[number];

export interface MetricsGridSort extends SerializableRecord {
  sortField: MetricsGridSortField;
  sortDirection: MetricsGridSortDirection;
}

export const METRICS_GRID_SORT_DEFAULTS: MetricsGridSort = {
  sortField: 'alphabetically',
  sortDirection: 'asc',
};
