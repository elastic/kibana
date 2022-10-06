/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import color from 'color';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { getStopsWithColorsFromRanges, PaletteConfig } from '../../../utils';
import { PaletteParams } from './types';

type ColorStopsWithMinMax = Pick<
  CustomPaletteParams,
  'colorStops' | 'stops' | 'steps' | 'rangeMax' | 'rangeMin' | 'continuity'
>;

const buildPaletteParams = ({ color: colors, stop }: PaletteConfig): ColorStopsWithMinMax => {
  const colorsWithoutStartColor = colors.slice(1, colors.length);
  return {
    rangeMin: stop[0],
    rangeMax: stop[stop.length - 1],
    continuity: 'none',
    colorStops: colorsWithoutStartColor.map((c, index) => ({
      color: color(c!).hex(),
      stop: stop[index],
    })),
    stops: colorsWithoutStartColor.map((c, index) => ({
      color: color(c!).hex(),
      stop: stop[index + 1],
    })),
  };
};

const buildCustomPalette = (
  colorStopsWithMinMax: ColorStopsWithMinMax
): PaletteOutput<CustomPaletteParams> => {
  return {
    name: 'custom',
    params: {
      maxSteps: 5,
      name: 'custom',
      progression: 'fixed',
      rangeMax: Infinity,
      rangeMin: -Infinity,
      rangeType: 'number',
      reverse: false,
      ...colorStopsWithMinMax,
    },
    type: 'palette',
  };
};

export const getPalette = (
  params: PaletteParams
): PaletteOutput<CustomPaletteParams> | undefined => {
  const { colorSchema, colorsRange, invertColors } = params;

  if (!(colorsRange && colorsRange.length)) {
    return;
  }

  const stopsWithColors = getStopsWithColorsFromRanges(colorsRange, colorSchema, invertColors);
  return buildCustomPalette(buildPaletteParams(stopsWithColors));
};
