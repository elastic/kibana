/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnPalette, KbnPalettes } from '@kbn/palettes';
import { ColorMapping, DEFAULT_COLOR_MAPPING_CONFIG } from '../../shared_components';
import { isNotNull } from '../../shared_components/color_mapping/components/assignment/match';

const singleColorGradientPalettes = new Set<string>([
  KbnPalette.Red,
  KbnPalette.Green,
  KbnPalette.Cool,
  KbnPalette.Warm,
  KbnPalette.Gray,
]);

/**
 * Returns color mapping config from a `KbnPalette`
 *
 * Converts gradients to their equivalent color mapping config
 */
export function getConfigFromPalette(
  palettes: KbnPalettes,
  paletteId: string
): ColorMapping.Config {
  const palette = palettes.get(paletteId);

  if (palette.type === 'categorical') {
    return {
      ...DEFAULT_COLOR_MAPPING_CONFIG,
      paletteId,
    };
  }

  const defaultPaletteColorMap = new Map(
    palettes
      .get(KbnPalette.Default)
      .colors()
      .map((color, i) => [color.toLowerCase(), i])
  );
  const colors = palette.colors(3).reverse();
  const steps = colors
    .map<number | string | null>((color, i) => {
      const colorIndex = defaultPaletteColorMap.get(color.toLowerCase()) ?? -1;
      if (colorIndex > 0) return colorIndex;
      if (singleColorGradientPalettes.has(palette.id) && i > 0) return null;
      return color;
    })
    .filter(isNotNull)
    .map(
      (color) =>
        ({
          touched: false,
          ...(typeof color === 'number'
            ? {
                paletteId: KbnPalette.Default,
                type: 'categorical',
                colorIndex: color,
              }
            : {
                type: 'colorCode',
                colorCode: color,
              }),
        } satisfies ColorMapping.ColorStep)
    );

  return {
    ...DEFAULT_COLOR_MAPPING_CONFIG,
    paletteId: KbnPalette.Default,
    colorMode: {
      type: 'gradient',
      steps,
      sort: 'asc', // match original gradient palette direction
    } satisfies ColorMapping.GradientColorMode,
  };
}
