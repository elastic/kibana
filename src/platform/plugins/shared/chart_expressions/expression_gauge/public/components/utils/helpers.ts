/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/public';

const calculateRealRangeValueMin = (
  relativeRangeValue: number,
  { min, max }: { min: number; max: number }
) => {
  if (isFinite(relativeRangeValue)) {
    return relativeRangeValue * ((max - min) / 100);
  }
  return min;
};

const calculateRealRangeValueMax = (
  relativeRangeValue: number,
  { min, max }: { min: number; max: number }
) => {
  if (isFinite(relativeRangeValue)) {
    return relativeRangeValue * ((max - min) / 100);
  }

  return max;
};

export const computeMinMax = (
  paletteConfig: PaletteOutput<CustomPaletteState>,
  bands: number[]
) => {
  const { rangeMin, rangeMax, range }: CustomPaletteState = paletteConfig.params!;
  const minRealValue = bands[0];
  const maxRealValue = bands[bands.length - 1];
  let min = rangeMin;
  let max = rangeMax;

  if (range === 'percent') {
    const minMax = { min: minRealValue, max: maxRealValue };

    min = calculateRealRangeValueMin(min, minMax);
    max = calculateRealRangeValueMax(max, minMax);
  }

  if (range === 'number') {
    min = isFinite(min) ? min : minRealValue;
    max = isFinite(max) ? max : maxRealValue;
  }

  return {
    min,
    max,
  };
};
