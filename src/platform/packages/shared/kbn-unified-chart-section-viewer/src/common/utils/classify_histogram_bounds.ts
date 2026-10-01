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

/**
 * Returns MIN/MAX when both values are finite and min is less than max.
 */
export const parseHistogramBounds = (
  rawMin: RawHistogramBound,
  rawMax: RawHistogramBound
): HistogramBounds | undefined => {
  const min = toFiniteNumber(rawMin);
  const max = toFiniteNumber(rawMax);
  if (min === undefined || max === undefined || min >= max) {
    return undefined;
  }

  return { min, max };
};
