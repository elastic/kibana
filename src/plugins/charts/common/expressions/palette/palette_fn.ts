/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';
import { checkIsMaxContinuity, checkIsMinContinuity } from '@kbn/coloring';
import type { PaletteExpressionFunctionDefinition } from './types';
import { defaultCustomColors } from '../../constants';

export const paletteExpressionFn: PaletteExpressionFunctionDefinition['fn'] = async (
  input,
  args
) => {
  const { color, continuity, reverse, gradient, stop, range, rangeMin, rangeMax } = args;
  const colors = ([] as string[]).concat(color || defaultCustomColors);
  const stops = ([] as number[]).concat(stop || []);
  if (stops.length > 0 && colors.length !== stops.length) {
    throw Error('When stop is used, each color must have an associated stop value.');
  }

  // If the user has defined stops, choose rangeMin/Max, provided by user or range,
  // taken from first/last element of ranges or default range (0 or 100).
  const calculateRange = (
    userRange: number | undefined,
    stopsRange: number | undefined,
    defaultRange: number
  ) => userRange ?? stopsRange ?? defaultRange;

  const rangeMinDefault = 0;
  const rangeMaxDefault = 100;

  return {
    type: 'palette',
    name: 'custom',
    params: {
      colors: reverse ? colors.reverse() : colors,
      stops,
      range: range ?? 'percent',
      gradient,
      continuity,
      rangeMin: checkIsMinContinuity(continuity)
        ? Number.NEGATIVE_INFINITY
        : calculateRange(rangeMin, stops[0], rangeMinDefault),
      rangeMax: checkIsMaxContinuity(continuity)
        ? Number.POSITIVE_INFINITY
        : calculateRange(rangeMax, last(stops), rangeMaxDefault),
    },
  };
};
