/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const EUI_AMSTERDAM_PALETTE_COLORS = [
  '#54b399',
  '#6092c0',
  '#d36086',
  '#9170b8',
  '#ca8eae',
  '#d6bf57',
  '#b9a888',
  '#da8b45',
  '#aa6556',
  '#e7664c',
];

export const EUIAmsterdamColorBlindPalette: ColorMapping.CategoricalPalette = {
  id: 'eui_amsterdam_color_blind',
  name: 'Default',
  colorCount: EUI_AMSTERDAM_PALETTE_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return EUI_AMSTERDAM_PALETTE_COLORS[
      loop ? indexInRange % EUI_AMSTERDAM_PALETTE_COLORS.length : indexInRange
    ];
  },
};
