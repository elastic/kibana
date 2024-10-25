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

export const GREEN_PALETTE_COLORS = [
  // '#F6F9FC',
  // '#00BD79',
  '#EEFDF4',
  '#CAF1DB',
  '#A6E4C2',
  '#7ED8A9',
  '#4DCB91',
  '#00BD79',
];

export const GreenPalette: ColorMapping.CategoricalPalette = {
  id: 'green',
  name: i18n.translate('coloring.colorMapping.palettes.green.name', {
    defaultMessage: 'Positive',
  }),
  colorCount: GREEN_PALETTE_COLORS.length,
  type: 'gradient',
  getColor(indexInRange, isDarkMode, loop) {
    return GREEN_PALETTE_COLORS[loop ? indexInRange % GREEN_PALETTE_COLORS.length : indexInRange];
  },
};
