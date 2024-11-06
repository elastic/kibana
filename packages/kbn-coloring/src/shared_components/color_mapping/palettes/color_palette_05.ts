/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const COLOR_PALETTE_05_COLORS = [
  '#00B0AA',
  '#5DD8D2',
  '#3788FF',
  '#96C3FF',
  '#E54A91',
  '#FBA3C4',
  '#EE4C48',
  '#FFA59C',
  '#BC8300',
  '#DDBF6A',
];

export const ColorPalette05: ColorMapping.CategoricalPalette = {
  id: 'color_palette_E',
  name: 'Alternative Color Palette Seven Four',
  colorCount: COLOR_PALETTE_05_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return COLOR_PALETTE_05_COLORS[
      loop ? indexInRange % COLOR_PALETTE_05_COLORS.length : indexInRange
    ];
  },
};
