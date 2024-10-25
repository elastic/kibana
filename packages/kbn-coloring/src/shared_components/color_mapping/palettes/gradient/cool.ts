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

export const COOL_PALETTE_COLORS = [
  '#F1F9FF',
  '#D2E7FF',
  '#B4D5FF',
  '#96C3FF',
  '#78B0FF',
  '#599DFF',
];

export const CoolPalette: ColorMapping.CategoricalPalette = {
  id: 'cool',
  name: i18n.translate('coloring.colorMapping.palettes.cool.name', {
    defaultMessage: 'Cool',
  }),
  colorCount: COOL_PALETTE_COLORS.length,
  type: 'gradient',
  getColor(indexInRange, isDarkMode, loop) {
    return COOL_PALETTE_COLORS[loop ? indexInRange % COOL_PALETTE_COLORS.length : indexInRange];
  },
};
