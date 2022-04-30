/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { vislibColorMaps, ColorMap, ColorSchema } from './color_maps';

export const truncatedColorMaps: ColorMap = {};

const colormaps: ColorMap = vislibColorMaps;
for (const key in colormaps) {
  if (colormaps.hasOwnProperty(key)) {
    // slice off lightest colors
    // @ts-ignore
    const color = colormaps[key];
    truncatedColorMaps[key] = {
      ...color,
      value: color.value.slice(Math.floor(color.value.length / 4)),
    };
  }
}

export const truncatedColorSchemas: ColorSchema[] = Object.values(truncatedColorMaps).map(
  ({ id, label }) => ({
    value: id,
    text: label,
  })
);
