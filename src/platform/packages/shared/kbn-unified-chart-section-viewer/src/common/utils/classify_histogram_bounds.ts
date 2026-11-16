/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HistogramBounds } from '../../types';

/** A MIN/MAX cell as it arrives in an ES|QL row. */
export type RawHistogramBound = number | string | null | undefined;

const toFiniteNumber = (value: RawHistogramBound): number | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return toFiniteNumber(Number(value));
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

// Scale through decimal text so a value already on a hundredth, such as 2.3, stays put.
const toHundredths = (value: number, round: (scaled: number) => number): number =>
  round(Number((value * 100).toFixed(8))) / 100;

/**
 * Returns finite, ordered MIN/MAX rounded outward to hundredths, or undefined.
 * A point already on a hundredth stays a point.
 */
export const parseHistogramBounds = (
  rawMin: RawHistogramBound,
  rawMax: RawHistogramBound
): HistogramBounds | undefined => {
  const min = toFiniteNumber(rawMin);
  const max = toFiniteNumber(rawMax);
  if (min === undefined || max === undefined || min > max) {
    return undefined;
  }

  return { min: toHundredths(min, Math.floor), max: toHundredths(max, Math.ceil) };
};
