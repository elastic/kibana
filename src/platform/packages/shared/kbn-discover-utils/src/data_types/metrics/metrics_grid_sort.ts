/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

/**
 * Field the metrics grid is sorted by. Mirrors the viewer's `METRICS_SORT_BY`
 * values (`@kbn/unified-chart-section-viewer`).
 */
export type MetricsGridSortField = 'alphabetically' | 'recency';

/**
 * Direction the metrics grid is sorted in. Mirrors the viewer's
 * `METRICS_SORT_DIRECTION` values.
 */
export type MetricsGridSortDirection = 'asc' | 'desc';

/**
 * Serializable shape of the metrics grid sort selection persisted in Discover's
 * profile state.
 */
export interface MetricsGridSort extends SerializableRecord {
  field: MetricsGridSortField;
  direction: MetricsGridSortDirection;
}

/**
 * Default metrics grid sort. Kept equal to the viewer's `DEFAULT_METRICS_SORT`
 * (`['alphabetically', 'asc']`); a drift-guard test in
 * `@kbn/unified-chart-section-viewer` (`src/common/constants.test.ts`) enforces this.
 */
export const METRICS_GRID_SORT_DEFAULTS: MetricsGridSort = {
  field: 'alphabetically',
  direction: 'asc',
};
