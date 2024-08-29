/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const COLOR_PALETTE_01_COLORS = [
  '#00BEB8',
  '#93E5E0',
  '#599DFF',
  '#B4D5FF',
  '#ED6BA2',
  '#FFBED5',
  '#F66D64',
  '#FFC0B8',
  '#C79700',
  '#E8D297',
];

export const ColorPalette01: ColorMapping.CategoricalPalette = {
  id: 'color_palette_A',
  name: 'Default Color Palette',
  colorCount: COLOR_PALETTE_01_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return COLOR_PALETTE_01_COLORS[
      loop ? indexInRange % COLOR_PALETTE_01_COLORS.length : indexInRange
    ];
  },
};
