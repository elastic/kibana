/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { uniq } from 'lodash';
import { ColorSchemas, getHeatmapColors } from '../../../../charts/common';
import { Range, Datatable } from '../../../../expressions';

export interface PaletteConfig {
  color: Array<string | undefined>;
  stop: number[];
}
const MAX_COLOR_COUNT = 10;
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
  data: Datatable['rows'],
  accessor: string,
  colorsNumber: number,
  colorSchema: ColorSchemas,
  invertColors: boolean = false
) => {
  const values = uniq(data.map((d) => d[accessor]));
  const sortedValues = values.sort((a, b) => a - b);
  const [min] = sortedValues;
  const max = sortedValues[sortedValues.length - 1];
  const stops = [];
  const colors = [];
  for (let i = 0; i < colorsNumber; i++) {
    let val = i / colorsNumber;
    let nextVal = (i + 1) / colorsNumber;
    val = val * (max - min) + min;
    nextVal = nextVal * (max - min) + min;
    if (max - min > MAX_COLOR_COUNT) {
      const valInt = Math.ceil(val);
      if (i === 0) {
        val = valInt === val ? val : valInt - 1;
      } else {
        val = valInt;
      }
      nextVal = Math.ceil(nextVal);
    }
    stops.push(val);
    colors.push(getColor(i, colorsNumber, colorSchema, invertColors));
  }
  return {
    colors,
    stops,
  };
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
      acc.stop.push(range.from);

      return acc;
    },
    { color: [], stop: [] }
  );
};
