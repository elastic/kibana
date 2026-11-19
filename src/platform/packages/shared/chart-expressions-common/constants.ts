/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  HorizontalAlignment as HorizontalAlignmentType,
  LayoutDirection as LayoutDirectionType,
  LegendValue as LegendValueType,
  Position as PositionType,
  VerticalAlignment as VerticalAlignmentType,
} from '@elastic/charts';

/**
 * Server-safe re-exports of @elastic/charts constants.
 *
 * @elastic/charts is a browser-only library bundled via webpack for the client.
 * Importing it at runtime on the server forces Node.js to evaluate its entire
 * CJS barrel — including transitive ESM-only dependencies (e.g. uuid@14) —
 * which can crash Kibana at boot. These constants mirror the original values
 * and are validated against the library types at compile time via `satisfies`.
 */

export const ChartPosition = {
  Top: 'top',
  Bottom: 'bottom',
  Left: 'left',
  Right: 'right',
} as const satisfies Record<string, PositionType>;

export const ChartHorizontalAlignment = {
  Center: 'center',
  Right: 'right',
  Left: 'left',
  Near: 'near',
  Far: 'far',
} as const satisfies Record<string, HorizontalAlignmentType>;

export const ChartVerticalAlignment = {
  Middle: 'middle',
  Top: 'top',
  Bottom: 'bottom',
  Near: 'near',
  Far: 'far',
} as const satisfies Record<string, VerticalAlignmentType>;

export const ChartLayoutDirection = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
} as const satisfies Record<string, LayoutDirectionType>;

export const ChartLegendValue = {
  CurrentAndLastValue: 'currentAndLastValue',
  LastValue: 'lastValue',
  LastNonNullValue: 'lastNonNullValue',
  Average: 'average',
  Median: 'median',
  Max: 'max',
  Min: 'min',
  FirstValue: 'firstValue',
  FirstNonNullValue: 'firstNonNullValue',
  Total: 'total',
  Count: 'count',
  DistinctCount: 'distinctCount',
  Variance: 'variance',
  StdDeviation: 'stdDeviation',
  Range: 'range',
  Difference: 'difference',
  DifferencePercent: 'differencePercent',
  Value: 'value',
  Percent: 'percent',
} as const satisfies Record<string, LegendValueType>;
