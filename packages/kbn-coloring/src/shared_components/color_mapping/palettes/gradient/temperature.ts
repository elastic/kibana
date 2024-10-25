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

export const TEMPERATURE_PALETTE_COLORS = [
  '#599DFF',
  '#96C3FF',
  '#D2E7FF',
  '#F5F9FE',
  '#FFDAD5',
  '#FFA59C',
  '#F66D64',
];

export const TemperaturePalette: ColorMapping.CategoricalPalette = {
  id: 'temperature',
  name: i18n.translate('coloring.colorMapping.palettes.temperature.name', {
    defaultMessage: 'Temperature',
  }),
  colorCount: TEMPERATURE_PALETTE_COLORS.length,
  type: 'gradient',
  getColor(indexInRange, isDarkMode, loop) {
    return TEMPERATURE_PALETTE_COLORS[
      loop ? indexInRange % TEMPERATURE_PALETTE_COLORS.length : indexInRange
    ];
  },
};
