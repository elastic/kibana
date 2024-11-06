/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnPalettes } from '../classes/palettes';
import { ThemeMode } from '../types';
import { elasticPalette, getNeutralPalette } from './categorical';
import { elasticClassicPalette, kibana4Palette, kibana7Palette } from './legacy/categorical';
import {
  getComplementaryPalette,
  getCoolPalette,
  getGrayPalette,
  getGreenPalette,
  getRedPalette,
  statusPalette,
  getTemperaturePalette,
  getWarmPalette,
} from './gradient';

export const getPalettes = (mode: ThemeMode) =>
  new KbnPalettes(
    [
      elasticPalette,
      kibana7Palette,
      kibana4Palette,
      getNeutralPalette(mode),
      getComplementaryPalette(mode),
      getCoolPalette(mode),
      getGrayPalette(mode),
      getGreenPalette(mode),
      getRedPalette(mode),
      statusPalette,
      getTemperaturePalette(mode),
      getWarmPalette(mode),
      elasticClassicPalette,
    ],
    elasticPalette
  );

export { elasticPalette } from './categorical';
export * from './get_kbn_palettes';
