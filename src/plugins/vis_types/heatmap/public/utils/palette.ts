/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ColorSchemas, getHeatmapColors } from '../../../../charts/common';
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
