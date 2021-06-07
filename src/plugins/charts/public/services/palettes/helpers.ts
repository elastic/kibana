/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteState } from '../..';

function findColorSegment(
  value: number,
  comparison: (value: number, bucket: number) => number,
  colors: string[],
  rangeMin: number,
  rangeMax: number
) {
  // assume uniform distribution within the provided range, can ignore stops
  const step = (rangeMax - rangeMin) / colors.length;

  // what about values in range
  const index = colors.findIndex((c, i) => comparison(value, rangeMin + (1 + i) * step) <= 0);
  return colors[index] || colors[0];
}

function findColorsByStops(
  value: number,
  comparison: (value: number, bucket: number) => number,
  colors: string[],
  stops: number[]
) {
  const index = stops.findIndex((s) => comparison(value, s) < 0);
  return colors[index] || colors[0];
}

function getNormalizedValueByRange(
  value: number,
  { range }: CustomPaletteState,
  minMax: { min: number; max: number }
) {
  let result = value;
  if (range === 'percent') {
    result = (100 * (value - minMax.min)) / (minMax.max - minMax.min);
  }
  // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
  if (Number.isNaN(result)) {
    return 1;
  }
  return result;
}

/**
 * When stops are empty, it is assumed a predefined palette, so colors are distributed uniformly in the whole data range
 * When stops are passed, then rangeMin/rangeMax are used as reference for user defined limits:
 * continuity is defined over rangeMin/rangeMax, not these stops values (rangeMin/rangeMax are computed from user's stop inputs)
 */
export function workoutColorForValue(
  value: number | undefined,
  params: CustomPaletteState,
  minMax: { min: number; max: number }
) {
  if (value == null) {
    return;
  }
  const { colors, stops, range = 'percent', continuity = 'above', rangeMax, rangeMin } = params;
  // ranges can be absolute numbers or percentages
  // normalized the incoming value to the same format as range to make easier comparisons
  const normalizedValue = getNormalizedValueByRange(value, params, minMax);
  const dataRangeArguments = range === 'percent' ? [0, 100] : [minMax.min, minMax.max];
  const comparisonFn = (v: number, threshold: number) => v - threshold;

  // if steps are defined consider the specific rangeMax/Min as data boundaries
  const maxRange = stops.length ? rangeMax : dataRangeArguments[1];
  const minRange = stops.length ? rangeMin : dataRangeArguments[0];

  // in case of shorter rangers, extends the steps on the sides to cover the whole set
  if (comparisonFn(normalizedValue, maxRange) > 0) {
    if (continuity === 'above' || continuity === 'all') {
      return colors[colors.length - 1];
    }
    return;
  }
  if (comparisonFn(normalizedValue, minRange) < 0) {
    if (continuity === 'below' || continuity === 'all') {
      return colors[0];
    }
    return;
  }

  if (stops.length) {
    return findColorsByStops(normalizedValue, comparisonFn, colors, stops);
  }

  return findColorSegment(
    normalizedValue,
    comparisonFn,
    colors,
    dataRangeArguments[0],
    dataRangeArguments[1]
  );
}
