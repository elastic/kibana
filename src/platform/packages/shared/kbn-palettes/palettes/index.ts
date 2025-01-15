/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnPalettes } from '../classes/palettes';
import { elasticPalette, getElasticPalette, getNeutralPalette } from './categorical';
import { elasticClassicPalette, kibana4Palette, kibana7Palette } from './legacy/categorical';
import {
  complementaryPalette,
  coolPalette,
  grayPalette,
  greenPalette,
  redPalette,
  statusPalette,
  temperaturePalette,
  warmPalette,
} from './gradient';
export { logLevelPalette } from './semantic';

const getDarkKbnPalettes = () =>
  new KbnPalettes(
    [
      getElasticPalette(),
      kibana7Palette,
      kibana4Palette,
      getNeutralPalette(true),
      complementaryPalette,
      coolPalette,
      grayPalette,
      greenPalette,
      redPalette,
      statusPalette,
      temperaturePalette,
      warmPalette,
      elasticClassicPalette,
    ],
    elasticPalette
  );

const getLightKbnPalettes = () =>
  new KbnPalettes(
    [
      getElasticPalette(),
      kibana7Palette,
      kibana4Palette,
      getNeutralPalette(true),
      complementaryPalette,
      coolPalette,
      grayPalette,
      greenPalette,
      redPalette,
      statusPalette,
      temperaturePalette,
      warmPalette,
      elasticClassicPalette,
    ],
    elasticPalette
  );

const lightKbnPalettes = getLightKbnPalettes();
const darkKbnPalettes = getDarkKbnPalettes();

export const getPalettes = (darkMode: boolean, createNew: boolean = false) => {
  if (createNew) return darkMode ? getDarkKbnPalettes() : getLightKbnPalettes();
  return darkMode ? darkKbnPalettes : lightKbnPalettes;
};

export { elasticPalette } from './categorical';
export * from './get_kbn_palettes';
