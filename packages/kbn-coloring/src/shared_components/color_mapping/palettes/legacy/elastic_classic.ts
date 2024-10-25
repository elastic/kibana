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

export const ELASTIC_CLASSIC_PALETTE_COLORS = [
  '#20377d',
  '#7de2d1',
  '#ff957d',
  '#f04e98',
  '#0077cc',
  '#fec514',
];

export const ElasticClassicPalette: ColorMapping.CategoricalPalette = {
  id: 'elastic_brand_2023', // original id
  name: i18n.translate('coloring.colorMapping.palettes.classic.name', {
    defaultMessage: 'Elastic classic',
  }),
  colorCount: ELASTIC_CLASSIC_PALETTE_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return ELASTIC_CLASSIC_PALETTE_COLORS[
      loop ? indexInRange % ELASTIC_CLASSIC_PALETTE_COLORS.length : indexInRange
    ];
  },
};
