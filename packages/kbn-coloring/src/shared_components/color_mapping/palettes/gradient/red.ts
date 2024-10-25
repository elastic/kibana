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

export const RED_PALETTE_COLORS = [
  '#FFF4F1',
  '#FFDAD5',
  '#FFC0B8',
  '#FFA59C',
  '#FC8A80',
  '#F66D64',
];

export const RedPalette: ColorMapping.CategoricalPalette = {
  id: 'red',
  name: i18n.translate('coloring.colorMapping.palettes.red.name', {
    defaultMessage: 'Negative',
  }),
  colorCount: RED_PALETTE_COLORS.length,
  type: 'gradient',
  getColor(indexInRange, isDarkMode, loop) {
    return RED_PALETTE_COLORS[loop ? indexInRange % RED_PALETTE_COLORS.length : indexInRange];
  },
};
