/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkIsMaxContinuity, checkIsMinContinuity } from '@kbn/coloring';
import type { CustomPaletteState } from '../..';

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
  // see comment below in function 'findColorsByStops'
  return (
    colors[index] ??
    (value >= rangeMin + colors.length * step ? colors[colors.length - 1] : colors[0])
  );
}

function findColorsByStops(
  value: number,
  comparison: (value: number, bucket: number) => number,
  colors: string[],
  stops: number[]
) {
  const index = stops.findIndex((s) => comparison(value, s) < 0);
  // as we now we can provide 'rangeMax' as end for last interval (iterval [lastStop, rangeMax]),
  // value can be more that last stop but will be valid
  // because of this we should provide for that value the last color.
  // (For example, value = 100, last stop = 80, rangeMax = 120, before we was return the first color,
  //  but now we will return the last one)
  return (
    colors[index] ?? (value >= stops[stops.length - 1] ? colors[colors.length - 1] : colors[0])
  );
}

function getNormalizedValueByRange(
  value: number,
  { range, rangeMin }: CustomPaletteState,
  minMax: { min: number; max: number }
) {
  let result = value;
  if (range === 'percent') {
    result = (100 * (value - minMax.min)) / (minMax.max - minMax.min);

    // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
    if (Number.isNaN(result)) {
      return rangeMin;
    }
  }

  return result;
}

const getNormalizedMaxRange = (
  {
    stops,
    colors,
    rangeMax,
  }: Pick<CustomPaletteState, 'stops' | 'continuity' | 'colors' | 'rangeMax'>,
  isMaxContinuity: boolean,
  [min, max]: [number, number]
) => {
  if (isMaxContinuity) {
    return Number.POSITIVE_INFINITY;
  }

  return stops.length ? rangeMax : max - (max - min) / colors.length;
};

const getNormalizedMinRange = (
  { stops, rangeMin }: Pick<CustomPaletteState, 'stops' | 'continuity' | 'rangeMin'>,
  isMinContinuity: boolean,
  min: number
) => {
  if (isMinContinuity) {
    return Number.NEGATIVE_INFINITY;
  }

  return stops.length ? rangeMin : min;
};

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

  const isMinContinuity = checkIsMinContinuity(continuity);
  const isMaxContinuity = checkIsMaxContinuity(continuity);
  // ranges can be absolute numbers or percentages
  // normalized the incoming value to the same format as range to make easier comparisons
  const normalizedValue = getNormalizedValueByRange(value, params, minMax);

  const [min, max]: [number, number] = range === 'percent' ? [0, 100] : [minMax.min, minMax.max];

  const minRange = getNormalizedMinRange({ stops, rangeMin }, isMinContinuity, min);
  const maxRange = getNormalizedMaxRange({ stops, colors, rangeMax }, isMaxContinuity, [min, max]);

  const comparisonFn = (v: number, threshold: number) => v - threshold;

  if (comparisonFn(normalizedValue, minRange) < 0) {
    if (isMinContinuity) {
      return colors[0];
    }
    return;
  }

  if (comparisonFn(normalizedValue, maxRange) > 0) {
    if (isMaxContinuity) {
      return colors[colors.length - 1];
    }
    return;
  }

  if (stops.length) {
    return findColorsByStops(normalizedValue, comparisonFn, colors, stops);
  }

  return findColorSegment(normalizedValue, comparisonFn, colors, min, max);
}
