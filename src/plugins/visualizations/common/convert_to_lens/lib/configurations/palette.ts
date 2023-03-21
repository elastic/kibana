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
import { PercentageModeConfig, PercentageModeConfigWithMinMax } from '../../types';

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
  colorStopsWithMinMax: ColorStopsWithMinMax,
  isPercentRangeType: boolean = false
): PaletteOutput<CustomPaletteParams> => {
  return {
    name: 'custom',
    params: {
      maxSteps: 5,
      name: 'custom',
      progression: 'fixed',
      rangeMax: Infinity,
      rangeMin: -Infinity,
      rangeType: isPercentRangeType ? 'percent' : 'number',
      reverse: false,
      ...colorStopsWithMinMax,
    },
    type: 'palette',
  };
};

const convertToPercents = (
  value: number,
  { min, max }: PercentageModeConfigWithMinMax,
  isPercentPaletteSupported: boolean
) => {
  const percent = (value - min) / (max - min);
  return isPercentPaletteSupported ? percent * 100 : percent;
};

const convertToPercentColorStops = (
  colorStops: PaletteConfig,
  percentageModeConfig: PercentageModeConfigWithMinMax,
  isPercentPaletteSupported: boolean = false
) => {
  const stop = colorStops.stop.map((stopValue) =>
    convertToPercents(stopValue, percentageModeConfig, isPercentPaletteSupported)
  );
  return { ...colorStops, stop };
};

export const getPaletteFromStopsWithColors = (
  config: PaletteConfig,
  percentageModeConfig: PercentageModeConfig,
  isPercentPaletteSupported: boolean = false
) => {
  const percentStopsWithColors = percentageModeConfig.isPercentageMode
    ? convertToPercentColorStops(config, percentageModeConfig, isPercentPaletteSupported)
    : config;

  return buildCustomPalette(
    buildPaletteParams(percentStopsWithColors),
    isPercentPaletteSupported && percentageModeConfig.isPercentageMode
  );
};

export const getPalette = (
  params: PaletteParams,
  percentageModeConfig: PercentageModeConfig,
  isPercentPaletteSupported: boolean = false
): PaletteOutput<CustomPaletteParams> | undefined => {
  const { colorSchema, colorsRange, invertColors } = params;

  if (!(colorsRange && colorsRange.length)) {
    return;
  }

  const stopsWithColors = getStopsWithColorsFromRanges(colorsRange, colorSchema, invertColors);

  return getPaletteFromStopsWithColors(
    stopsWithColors,
    percentageModeConfig,
    isPercentPaletteSupported
  );
};
