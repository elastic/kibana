/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlind } from '@elastic/eui';
import { KbnPalette } from '../../constants';
import { KbnColorFnPalette } from '../../classes/color_fn_palette';

/**
 * Number of base colors in the legacy line optimized palette, from before the vis palette was extended.
 */
export const LEGACY_LINE_OPTIMIZED_PALETTE_SIZE = 10;

/**
 * Index pairs to swap within each group of vis palette colors.
 * Moves red tones away from pink for better adjacent-color contrast.
 */
const COLOR_SWAP_PAIRS: Array<[number, number]> = [
  [6, 8], // red <-> yellow (dark tones)
  [7, 9], // light-red <-> light-yellow
];

/**
 * Swaps color pairs within each group of `groupSize` colors to increase contrast
 * between adjacent hues (e.g., separating pink and red).
 */
export function swapColorPairs(colors: string[], groupSize: number): string[] {
  const result = [...colors];
  for (let groupStart = 0; groupStart < result.length; groupStart += groupSize) {
    if (groupStart + groupSize <= result.length) {
      for (const [a, b] of COLOR_SWAP_PAIRS) {
        [result[groupStart + a], result[groupStart + b]] = [
          result[groupStart + b],
          result[groupStart + a],
        ];
      }
    }
  }
  return result;
}

/**
 * Reorders colors so dark tones (even indices) come before light tones (odd indices)
 * within each group of `groupSize` colors.
 */
export function reorderDarkFirst(colors: string[], groupSize: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < colors.length; i += groupSize) {
    const group = colors.slice(i, i + groupSize);
    const dark = group.filter((_, idx) => idx % 2 === 0);
    const light = group.filter((_, idx) => idx % 2 !== 0);
    result.push(...dark, ...light);
  }
  return result;
}

/**
 * Builds the line optimized color order from the given base colors.
 */
export function getLineOptimizedColors(baseColors: string[]): string[] {
  return reorderDarkFirst(swapColorPairs(baseColors, baseColors.length), baseColors.length);
}

/**
 * Repeats the base colors without lightening on each rotation. In lines, lighter tones contrast is too low
 * + differences between rotations are hard to perceive.
 */
export function repeatColors(baseColors: string[], n: number): string[] {
  return Array.from({ length: n }, (_, i) => baseColors[i % baseColors.length]);
}

/**
 * Legacy line optimized palette. Color assignments store palette positions, so this must keep producing
 * the same colors for saved charts. Not selectable for new charts.
 */
export const elasticLineOptimizedPalette = new KbnColorFnPalette({
  id: KbnPalette.ElasticLineOptimizedLegacy,
  type: 'categorical',
  aliases: [],
  legacy: true,
  standalone: true,
  colorCount: LEGACY_LINE_OPTIMIZED_PALETTE_SIZE,
  defaultNumberOfColors: LEGACY_LINE_OPTIMIZED_PALETTE_SIZE * 3,
  name: i18n.translate('palettes.elasticLineOptimized.name', {
    defaultMessage: 'Elastic (line optimized)',
  }),
  colorFn: (n) =>
    repeatColors(
      getLineOptimizedColors(euiPaletteColorBlind().slice(0, LEGACY_LINE_OPTIMIZED_PALETTE_SIZE)),
      n
    ),
});
