/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Range } from '@kbn/expressions-plugin/common';
import { getConvertToLensModule } from '@kbn/visualizations-plugin/public';
import { HeatmapVisParams } from '../../types';
import { getStopsWithColorsFromColorsNumber } from '../../utils/palette';

type HeatmapVisParamsWithRanges = Omit<HeatmapVisParams, 'colorsRange'> & {
  colorsRange: Exclude<HeatmapVisParams['colorsRange'], undefined>;
};

const isHeatmapVisParamsWithRanges = (
  params: HeatmapVisParams | HeatmapVisParamsWithRanges
): params is HeatmapVisParamsWithRanges => {
  return Boolean(params.setColorRange && params.colorsRange && params.colorsRange.length);
};

export const getPaletteForHeatmap = async (params: HeatmapVisParams) => {
  const { getPalette, getPaletteFromStopsWithColors, getPercentageModeConfig } =
    await getConvertToLensModule();

  if (isHeatmapVisParamsWithRanges(params)) {
    const percentageModeConfig = getPercentageModeConfig(params, false);
    return getPalette(params, percentageModeConfig, params.percentageMode);
  }

  const { color, stop = [] } = getStopsWithColorsFromColorsNumber(
    params.colorsNumber,
    params.colorSchema,
    params.invertColors,
    true
  );
  const colorsRange: Range[] = [{ from: stop[0], to: stop[stop.length - 1], type: 'range' }];
  const { colorSchema, invertColors } = params;
  // palette is type of percent, if user wants dynamic calulated ranges
  const percentageModeConfig = getPercentageModeConfig(
    {
      colorsRange,
      colorSchema,
      invertColors,
      percentageMode: true,
    },
    false
  );

  return getPaletteFromStopsWithColors({ color, stop: stop ?? [] }, percentageModeConfig, true);
};
