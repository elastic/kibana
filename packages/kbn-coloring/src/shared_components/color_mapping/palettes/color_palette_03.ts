/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const COLOR_PALETTE_03_COLORS = [
  '#00605D',
  '#009E99',
  '#00419E',
  '#2476F0',
  '#85044B',
  '#D13680',
  '#8C0210',
  '#DA3737',
  '#6A3F00',
  '#AA7100',
];

export const ColorPalette03: ColorMapping.CategoricalPalette = {
  id: 'color_palette_C',
  name: 'High Contrast',
  colorCount: COLOR_PALETTE_03_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return COLOR_PALETTE_03_COLORS[
      loop ? indexInRange % COLOR_PALETTE_03_COLORS.length : indexInRange
    ];
  },
};
