/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricUnit } from '../../../types';

const DURATION_FROM_UNIT = {
  ns: 'ns',
  us: 'us',
  ms: 'ms',
  s: 's',
  m: 'min',
  h: 'h',
  d: 'd',
} as const;

type DurationFromUnit = (typeof DURATION_FROM_UNIT)[keyof typeof DURATION_FROM_UNIT];

/** Lens API format for a heatmap value column. Keeps the column numeric so the axis sorts by value. */
export type HeatmapValueFormat =
  | { readonly type: 'number'; readonly decimals: number; readonly compact: boolean }
  | { readonly type: 'percent'; readonly decimals: number; readonly compact: boolean }
  | { readonly type: 'bytes'; readonly decimals: number }
  | { readonly type: 'bits'; readonly decimals: number }
  | {
      readonly type: 'duration';
      readonly from: DurationFromUnit;
      readonly to: 'auto';
      readonly decimals: number;
    };

const isDurationUnit = (unit: string): unit is keyof typeof DURATION_FROM_UNIT =>
  unit in DURATION_FROM_UNIT;

const isSpecialUnitOfCount = (unit: string): unit is `{${string}}` =>
  unit.match(/^\{.*\}$/) !== null;

/**
 * Maps a metric unit onto the Lens API format used by the heatmap value axis.
 * Units outside number, percent, bytes, bits, and duration stay unformatted.
 */
export const getHeatmapValueFormat = (
  unit: MetricUnit | 'bits' | undefined
): HeatmapValueFormat | undefined => {
  if (!unit || unit === 'count' || isSpecialUnitOfCount(unit)) {
    return { type: 'number', decimals: 0, compact: false };
  }

  if (unit === 'percent') {
    return { type: 'percent', decimals: 1, compact: false };
  }

  if (unit === 'bytes') {
    return { type: 'bytes', decimals: 1 };
  }

  if (unit === 'bits') {
    return { type: 'bits', decimals: 1 };
  }

  if (isDurationUnit(unit)) {
    return { type: 'duration', from: DURATION_FROM_UNIT[unit], to: 'auto', decimals: 0 };
  }

  return undefined;
};
