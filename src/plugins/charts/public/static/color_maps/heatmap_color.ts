/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { vislibColorMaps, RawColorSchema } from './color_maps';

function enforceBounds(x: number) {
  if (x < 0) {
    return 0;
  } else if (x > 1) {
    return 1;
  } else {
    return x;
  }
}

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
  return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];
}

export function getHeatmapColors(value: any, colorSchemaName: string) {
  if (!_.isNumber(value) || value < 0 || value > 1) {
    throw new Error('heatmap_color expects a number from 0 to 1 as first parameter');
  }

  // @ts-ignore
  const colorSchema = vislibColorMaps[colorSchemaName].value;
  if (!colorSchema) {
    throw new Error('invalid colorSchemaName provided');
  }

  const color = interpolateLinearly(value, colorSchema);
  const r = Math.round(255 * color[0]);
  const g = Math.round(255 * color[1]);
  const b = Math.round(255 * color[2]);
  return `rgb(${r},${g},${b})`;
}

function drawColormap(colorSchema: string, width = 100, height = 10) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx === null) {
    throw new Error('no HeatmapColors canvas context found');
  }

  for (let i = 0; i <= width; i++) {
    ctx.fillStyle = getHeatmapColors(i / width, colorSchema);
    ctx.fillRect(i, 0, 1, height);
  }
  return canvas;
}

getHeatmapColors.prototype.drawColormap = drawColormap;
