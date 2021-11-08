/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ColorSchemas, getHeatmapColors } from '../../../../charts/common';
import { CustomPaletteState } from '../../../../charts/public';
import { Range } from '../../../../expressions';

export interface PaletteConfig {
  color: Array<string | undefined>;
  stop: number[];
}
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const getColor = (
  index: number,
  elementsCount: number,
  colorSchema: ColorSchemas,
  invertColors: boolean = false
) => {
  const value = invertColors ? 1 - index / elementsCount : index / elementsCount;
  return getHeatmapColors(value, colorSchema);
};

function getStops(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (stops.length) {
    return stops.slice(0, stops.length - 1);
  }
  // Do not use relative values here
  const maxValue = range === 'percent' ? 100 : max;
  const minValue = range === 'percent' ? 0 : min;
  const step = (maxValue - minValue) / colors.length;
  return colors.slice(0, colors.length - 1).map((_, i) => minValue + (i + 1) * step);
}

// temporary functions, move to charts plugin
// same functions as lens
export const shiftAndNormalizeStops = (
  params: CustomPaletteState,
  { min, max }: { min: number; max: number }
) => {
  const absMin = params.range === 'percent' ? 0 : min;
  // data min is the fallback in case of default options
  return [params.stops.length ? params.rangeMin : absMin, ...getStops(params, { min, max })].map(
    (value) => {
      let result = value;
      if (params.range === 'percent') {
        result = min + ((max - min) * value) / 100;
      }
      // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
      if (Number.isNaN(result)) {
        return 1;
      }
      return Number(result.toFixed(2));
    }
  );
};

export const getStopsWithColorsFromColorsNumber = (
  colorsNumber: number | '',
  colorSchema: ColorSchemas,
  invertColors: boolean = false
) => {
  const colors = [];
  const stops = [];
  if (!colorsNumber) {
    return { color: [] };
  }
  const step = 100 / colorsNumber;
  for (let i = 0; i < colorsNumber; i++) {
    colors.push(getColor(i, colorsNumber, colorSchema, invertColors));
    stops.push(step + i * step);
  }
  return { color: colors ?? [], stop: stops ?? [] };
};

export const getStopsWithColorsFromRanges = (
  ranges: Range[],
  colorSchema: ColorSchemas,
  invertColors: boolean = false
) => {
  return ranges.reduce<PaletteConfig>(
    (acc, range, index, rangesArr) => {
      if (index && range.from !== rangesArr[index - 1].to) {
        acc.color.push(TRANSPARENT);
        acc.stop.push(range.from);
      }

      acc.color.push(getColor(index, rangesArr.length, colorSchema, invertColors));
      acc.stop.push(range.to);

      return acc;
    },
    { color: [], stop: [] }
  );
};
