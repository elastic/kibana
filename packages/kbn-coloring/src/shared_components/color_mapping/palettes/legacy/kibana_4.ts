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

export const KIBANA_4_PALETTE_COLORS = [
  '#00a69b',
  '#57c17b',
  '#6f87d8',
  '#663db8',
  '#bc52bc',
  '#9e3533',
  '#daa05d',
];

export const Kibana4Palette: ColorMapping.CategoricalPalette = {
  id: 'kibana_v7_legacy', // original id
  name: i18n.translate('coloring.colorMapping.palettes.kibana4.name', {
    defaultMessage: 'Kibana 4',
  }),
  colorCount: KIBANA_4_PALETTE_COLORS.length,
  type: 'categorical',
  getColor(indexInRange, isDarkMode, loop) {
    return KIBANA_4_PALETTE_COLORS[
      loop ? indexInRange % KIBANA_4_PALETTE_COLORS.length : indexInRange
    ];
  },
};
