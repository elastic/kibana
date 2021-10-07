/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isColorDark } from '@elastic/eui';
import { Datatable } from 'src/plugins/expressions';

export type ColumnGroups<T = number[]> = Record<string, T>;

export interface MinMax {
  min: number;
  max: number;
}

export const getMinMax = (elements: number[]) => {
  if (!elements.length) {
    return { min: -Infinity, max: -Infinity };
  }

  const sortedArray = elements.sort((a, b) => a - b);
  return { min: sortedArray[0], max: sortedArray[sortedArray.length - 1] };
};

export const groupValuesByColumns = (datatable: Datatable) => {
  const numericColumns = datatable.columns
    .filter((column) => column.meta.type === 'number')
    .map((column) => column.id);

  return numericColumns.reduce<ColumnGroups>((groups, columnId) => {
    groups[columnId] = datatable.rows.map((row) => row[columnId]);
    return groups;
  }, {});
};

export const getMinMaxForColumns = (datatable: Datatable) => {
  const groups = groupValuesByColumns(datatable);
  return Object.keys(groups).reduce<ColumnGroups<MinMax>>((minMaxGroups, columnId) => {
    minMaxGroups[columnId] = getMinMax(groups[columnId]);
    return minMaxGroups;
  }, {});
};

export const parseRgbString = (rgb: string) => {
  const groups = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*?(,\s*(\d+)\s*)?\)/) ?? [];
  if (!groups) {
    return null;
  }

  const red = parseFloat(groups[1]);
  const green = parseFloat(groups[2]);
  const blue = parseFloat(groups[3]);
  const opacity = groups[5] ? parseFloat(groups[5]) : undefined;

  return { red, green, blue, opacity };
};

export const shouldApplyColor = (color: string) => {
  const rgb = parseRgbString(color);
  const { opacity } = rgb ?? {};
  return !rgb || (rgb && opacity !== 0); // if opacity === 0 it means, there is no color to apply to the metric
};

export const needsLightText = (bgColor: string = '') => {
  const rgb = parseRgbString(bgColor);
  if (!rgb) {
    return false;
  }

  const { red, green, blue, opacity } = rgb;
  return isColorDark(red, green, blue) && opacity !== 0;
};
