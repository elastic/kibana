/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const ELASTIC_BRAND_PALETTE_COLORS = [
  '#20377d',
  '#7de2d1',
  '#ff957d',
  '#f04e98',
  '#0077cc',
  '#fec514',
];

export const ElasticBrandPalette: ColorMapping.CategoricalPalette = {
  id: 'elastic_brand_2023',
  name: 'Elastic Brand',
  colorCount: ELASTIC_BRAND_PALETTE_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return ELASTIC_BRAND_PALETTE_COLORS[
      loop ? indexInRange % ELASTIC_BRAND_PALETTE_COLORS.length : indexInRange
    ];
  },
};
