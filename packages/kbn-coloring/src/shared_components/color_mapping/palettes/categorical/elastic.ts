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

export const ELASTIC_PALETTE_COLORS = [
  '#00BEB8',
  '#93E5E0',
  '#599DFF',
  '#B4D5FF',
  '#ED6BA2',
  '#FFBED5',
  '#F66D64',
  '#FFC0B8',
  '#ED9E00',
  '#FFD569',
  '#00CBC5',
  '#C0F1EE',
  '#78B0FF',
  '#D2E7FF',
  '#F588B3',
  '#FFD9E7',
  '#FC8A80',
  '#FFDAD5',
  '#F5AF00',
  '#FCE8B0',
  '#5DD8D2',
  '#D9FDFB',
  '#96C3FF',
  '#E5F1FF',
  '#FBA3C4',
  '#FFEBF5',
  '#FFA59C',
  '#FFE9E5',
  '#FEC514',
  '#FFF1CC',
];

export const ElasticPalette: ColorMapping.CategoricalPalette = {
  id: 'elastic_borealis',
  name: i18n.translate('coloring.colorMapping.palettes.elastic.name', {
    defaultMessage: 'Elastic (default)',
  }),
  colorCount: ELASTIC_PALETTE_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return ELASTIC_PALETTE_COLORS[
      loop ? indexInRange % ELASTIC_PALETTE_COLORS.length : indexInRange
    ];
  },
};
