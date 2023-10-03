/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

export const KIBANA_V7_LEGACY_PALETTE_COLORS = [
  '#00a69b',
  '#57c17b',
  '#6f87d8',
  '#663db8',
  '#bc52bc',
  '#9e3533',
  '#daa05d',
];

export const KibanaV7LegacyPalette: ColorMapping.CategoricalPalette = {
  id: 'kibana_v7_legacy',
  name: 'Kibana Legacy',
  colorCount: KIBANA_V7_LEGACY_PALETTE_COLORS.length,
  type: 'categorical',
  getColor(valueInRange) {
    return KIBANA_V7_LEGACY_PALETTE_COLORS[valueInRange];
  },
};
