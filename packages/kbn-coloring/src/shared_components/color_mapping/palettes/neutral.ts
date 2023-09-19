/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '../config';

const schemeGreys = ['#f2f4fb', '#d4d9e5', '#98a2b3', '#696f7d', '#353642'];
export const NEUTRAL_COLOR_LIGHT = schemeGreys.slice();
export const NEUTRAL_COLOR_DARK = schemeGreys.slice().reverse();

export const NeutralPalette: ColorMapping.CategoricalPalette = {
  id: 'neutral',
  name: 'Neutral',
  colorCount: NEUTRAL_COLOR_LIGHT.length,
  type: 'categorical',
  getColor(valueInRange, isDarkMode) {
    return isDarkMode ? NEUTRAL_COLOR_DARK[valueInRange] : NEUTRAL_COLOR_LIGHT[valueInRange];
  },
};
