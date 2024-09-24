/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNumber, clamp } from 'lodash';

import { vislibColorMaps, RawColorSchema } from './color_maps';

function interpolateLinearly(x: number, values: RawColorSchema['value']) {
  // Split values into four lists
  const xValues: number[] = [];
  const rValues: number[] = [];
  const gValues: number[] = [];
  const bValues: number[] = [];
  values.forEach((value) => {
    xValues.push(value[0]);
    rValues.push(value[1][0]);
    gValues.push(value[1][1]);
    bValues.push(value[1][2]);
  });

  let i = 1;
  while (xValues[i] < x) i++;
  const width = Math.abs(xValues[i - 1] - xValues[i]);
  const scalingFactor = (x - xValues[i - 1]) / width;
  // Get the new color values though interpolation
  const r = rValues[i - 1] + scalingFactor * (rValues[i] - rValues[i - 1]);
  const g = gValues[i - 1] + scalingFactor * (gValues[i] - gValues[i - 1]);
  const b = bValues[i - 1] + scalingFactor * (bValues[i] - bValues[i - 1]);
  return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
}

export function getHeatmapColors(value: any, colorSchemaName: string) {
  if (!isNumber(value) || value < 0 || value > 1) {
    throw new Error('heatmap_color expects a number from 0 to 1 as first parameter');
  }

  const colorSchema = vislibColorMaps[colorSchemaName]?.value;
  if (!colorSchema) {
    throw new Error('invalid colorSchemaName provided');
  }

  const color = interpolateLinearly(value, colorSchema);
  const r = Math.round(255 * color[0]);
  const g = Math.round(255 * color[1]);
  const b = Math.round(255 * color[2]);
  return `rgb(${r},${g},${b})`;
}
