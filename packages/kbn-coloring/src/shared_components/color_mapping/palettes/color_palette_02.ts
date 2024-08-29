/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const COLOR_PALETTE_02_COLORS = [
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
  '#00CBC5',
  '#C0F1EE',
  '#78B0FF',
  '#D2E7FF',
  '#F588B3',
  '#FFD9E7',
  '#FC8A80',
  '#FFDAD5',
  '#D2AB30',
  '#F3E5C1',
  '#5DD8D2',
  '#EAFDFC',
  '#96C3FF',
  '#F1F9FF',
  '#FBA3C4',
  '#FFF3F9',
  '#FFA59C',
  '#FFF4F1',
  '#DDBF6A',
  '#FEF8EA',
];

export const ColorPalette02: ColorMapping.CategoricalPalette = {
  id: 'color_palette_B',
  name: 'Default Color Palette Extended',
  colorCount: COLOR_PALETTE_02_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return COLOR_PALETTE_02_COLORS[
      loop ? indexInRange % COLOR_PALETTE_02_COLORS.length : indexInRange
    ];
  },
};
