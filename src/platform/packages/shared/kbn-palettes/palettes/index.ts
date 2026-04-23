/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnPalettes } from '../classes/palettes';
import {
  elasticPalette,
  elasticLineOptimizedPalette,
  getNeutralPalette,
  severityPalette,
} from './categorical';
import { elasticClassicPalette, kibana4Palette, kibana7Palette } from './legacy/categorical';
import {
  compareToPalette,
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

const darkKbnPalettes = new KbnPalettes(
  [
    elasticPalette,
    elasticLineOptimizedPalette,
    severityPalette,
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
    compareToPalette,
  ],
  elasticPalette
);

const lightKbnPalettes = new KbnPalettes(
  [
    elasticPalette,
    elasticLineOptimizedPalette,
    severityPalette,
    kibana7Palette,
    kibana4Palette,
    getNeutralPalette(false),
    complementaryPalette,
    coolPalette,
    grayPalette,
    greenPalette,
    redPalette,
    statusPalette,
    temperaturePalette,
    warmPalette,
    elasticClassicPalette,
    compareToPalette,
  ],
  elasticPalette
);

export const getPalettes = (darkMode: boolean) => (darkMode ? darkKbnPalettes : lightKbnPalettes);

/**
 * Palettes the Lens UI exposes in its dynamic, value-based coloring picker.
 *
 * The picker shows palettes flagged `canDynamicColoring: true`, and that flag
 * is only set by `buildGradient` in the charts plugin
 * (`src/platform/plugins/shared/charts/public/services/palettes/palettes.tsx`),
 * which the plugin calls for every non-standalone gradient palette from
 * `@kbn/palettes`. So the picker's contents are exactly the
 * `type === 'gradient'` palettes returned by `KbnPalettes.getAll()` (which
 * already drops `standalone` ones like `compareTo`).
 *
 * Resolved from the light Borealis registry, which is fine because Borealis
 * only diverges between light and dark on `euiColorVisText*` — none of which
 * feed into the gradient palette color functions. So the hex values are
 * identical in dark mode and we can safely evaluate this once at module load.
 */
export const LENS_DYNAMIC_COLOR_PALETTES = lightKbnPalettes
  .getAll()
  .filter((palette) => palette.type === 'gradient');

export { elasticPalette, elasticLineOptimizedPalette } from './categorical';
export * from './get_kbn_palettes';
