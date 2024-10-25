/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ColorMapping } from '../../config';

export const GRAY_PALETTE_COLORS = [
  '#F5F9FF',
  '#DEE7F4',
  '#C7D5E9',
  '#B1C3DE',
  '#9CB1D3',
  '#86A0C8',
];

export const GrayPalette: ColorMapping.CategoricalPalette = {
  id: 'gray',
  name: i18n.translate('coloring.colorMapping.palettes.gray.name', {
    defaultMessage: 'Gray',
  }),
  colorCount: GRAY_PALETTE_COLORS.length,
  type: 'gradient',
  getColor(indexInRange, isDarkMode, loop) {
    return GRAY_PALETTE_COLORS[loop ? indexInRange % GRAY_PALETTE_COLORS.length : indexInRange];
  },
};
