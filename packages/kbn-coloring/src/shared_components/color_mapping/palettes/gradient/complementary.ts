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

export const COMPLEMENTARY_PALETTE_COLORS = [
  '#599DFF',
  '#96C3FF',
  '#D2E7FF',
  '#F5F9FE',
  '#F3E5C1',
  '#DDBF6A',
  '#C79700',
];

export const ComplementaryPalette: ColorMapping.CategoricalPalette = {
  id: 'complementary',
  name: i18n.translate('coloring.colorMapping.palettes.complementary.name', {
    defaultMessage: 'Complementary',
  }),
  colorCount: COMPLEMENTARY_PALETTE_COLORS.length,
  type: 'gradient',
  getColor(indexInRange, isDarkMode, loop) {
    return COMPLEMENTARY_PALETTE_COLORS[
      loop ? indexInRange % COMPLEMENTARY_PALETTE_COLORS.length : indexInRange
    ];
  },
};
