/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const COLOR_PALETTE_04_COLORS = [
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
  '#007775',
  '#00B0AA',
  '#004FC7',
  '#3788FF',
  '#A6005E',
  '#E54A91',
  '#AF000E',
  '#EE4C48',
  '#854D00',
  '#BC8300',
  '#008C88',
  '#00BEB8',
  '#0B64DD',
  '#599DFF',
  '#BD1F70',
  '#ED6BA2',
  '#C61E25',
  '#F66D64',
  '#996000',
  '#C79700',
];

export const ColorPalette04: ColorMapping.CategoricalPalette = {
  id: 'color_palette_D',
  name: 'High Contrast Expanded',
  colorCount: COLOR_PALETTE_04_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return COLOR_PALETTE_04_COLORS[
      loop ? indexInRange % COLOR_PALETTE_04_COLORS.length : indexInRange
    ];
  },
};
