/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const OperationsWithSourceField = {
  FILTERS: 'filters',
  RANGE: 'range',
  TERMS: 'terms',
  DATE_HISTOGRAM: 'date_histogram',
  MIN: 'min',
  MAX: 'max',
  AVERAGE: 'average',
  SUM: 'sum',
  MEDIAN: 'median',
  STANDARD_DEVIATION: 'standard_deviation',
  UNIQUE_COUNT: 'unique_count',
  PERCENTILE: 'percentile',
  PERCENTILE_RANK: 'percentile_rank',
  COUNT: 'count',
  LAST_VALUE: 'last_value',
} as const;

export const OperationsWithReferences = {
  CUMULATIVE_SUM: 'cumulative_sum',
  COUNTER_RATE: 'counter_rate',
  DIFFERENCES: 'differences',
  MOVING_AVERAGE: 'moving_average',
  FORMULA: 'formula',
  STATIC_VALUE: 'static_value',
  NORMALIZE_BY_UNIT: 'normalize_by_unit',
} as const;

export const Operations = { ...OperationsWithSourceField, ...OperationsWithReferences } as const;

export const PartitionChartTypes = {
  PIE: 'pie',
  DONUT: 'donut',
  TREEMAP: 'treemap',
  MOSAIC: 'mosaic',
  WAFFLE: 'waffle',
} as const;

export const CategoryDisplayTypes = {
  DEFAULT: 'default',
  INSIDE: 'inside',
  HIDE: 'hide',
} as const;

export const NumberDisplayTypes = {
  HIDDEN: 'hidden',
  PERCENT: 'percent',
  VALUE: 'value',
} as const;

export const LegendDisplayTypes = {
  DEFAULT: 'default',
  SHOW: 'show',
  HIDE: 'hide',
} as const;

export const LayerTypes = {
  DATA: 'data',
  REFERENCELINE: 'referenceLine',
  ANNOTATIONS: 'annotations',
} as const;

export const XYCurveTypes = {
  LINEAR: 'LINEAR',
  CURVE_MONOTONE_X: 'CURVE_MONOTONE_X',
  CURVE_STEP_AFTER: 'CURVE_STEP_AFTER',
} as const;

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const;

export const SeriesTypes = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  BAR_STACKED: 'bar_stacked',
  AREA_STACKED: 'area_stacked',
  BAR_HORIZONTAL: 'bar_horizontal',
  BAR_PERCENTAGE_STACKED: 'bar_percentage_stacked',
  BAR_HORIZONTAL_STACKED: 'bar_horizontal_stacked',
  AREA_PERCENTAGE_STACKED: 'area_percentage_stacked',
  BAR_HORIZONTAL_PERCENTAGE_STACKED: 'bar_horizontal_percentage_stacked',
} as const;

export const FillTypes = {
  NONE: 'none',
  ABOVE: 'above',
  BELOW: 'below',
} as const;

export const RANGE_MODES = {
  Range: 'range',
  Histogram: 'histogram',
} as const;

export const GaugeShapes = {
  HORIZONTAL_BULLET: 'horizontalBullet',
  VERTICAL_BULLET: 'verticalBullet',
  SEMI_CIRCLE: 'semiCircle',
  ARC: 'arc',
  CIRCLE: 'circle',
} as const;

export const GaugeTicksPositions = {
  HIDDEN: 'hidden',
  AUTO: 'auto',
  BANDS: 'bands',
} as const;

export const GaugeLabelMajorModes = {
  AUTO: 'auto',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export const GaugeCentralMajorModes = {
  AUTO: 'auto',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export const GaugeColorModes = {
  PALETTE: 'palette',
  NONE: 'none',
} as const;

export const CollapseFunctions = ['sum', 'avg', 'min', 'max'] as const;
