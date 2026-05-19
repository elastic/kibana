/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PARTITION_CHART_TYPES = {
  PIE: 'pie',
  DONUT: 'donut',
  TREEMAP: 'treemap',
  MOSAIC: 'mosaic',
  WAFFLE: 'waffle',
} as const;

/**
 * Partition chart shapes that default `includeEmptyRows` off for `date_histogram`.
 */
export const PARTITION_CHART_TYPES_WITH_DEFAULT_EMPTY_ROWS_OFF = [
  PARTITION_CHART_TYPES.PIE,
  PARTITION_CHART_TYPES.DONUT,
  PARTITION_CHART_TYPES.TREEMAP,
  PARTITION_CHART_TYPES.WAFFLE,
  PARTITION_CHART_TYPES.MOSAIC,
] as const;

const partitionChartTypesWithDefaultEmptyRowsOffSet = new Set<string>(
  PARTITION_CHART_TYPES_WITH_DEFAULT_EMPTY_ROWS_OFF
);

/**
 * Returns true when the partition subtype should default `includeEmptyRows` off.
 */
export const isPartitionChartTypeWithDefaultEmptyRowsOff = (
  chartType: string | null | undefined
): chartType is (typeof PARTITION_CHART_TYPES_WITH_DEFAULT_EMPTY_ROWS_OFF)[number] =>
  typeof chartType === 'string' && partitionChartTypesWithDefaultEmptyRowsOffSet.has(chartType);

export const PARTITION_EMPTY_SIZE_RADIUS = {
  SMALL: 0.3,
  MEDIUM: 0.54,
  LARGE: 0.7,
} as const;

export const PARTITION_LABEL_POSITIONS = {
  INSIDE: 'inside',
  DEFAULT: 'default',
} as const;

export const PARTITION_VALUE_FORMATS = {
  PERCENT: 'percent',
  VALUE: 'value',
} as const;

export const LENS_PARTITION_DEFAULT_PERCENT_DECIMALS = 2;
