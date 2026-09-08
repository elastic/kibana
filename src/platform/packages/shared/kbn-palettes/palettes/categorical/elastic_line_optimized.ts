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
import { visPaletteSize } from './elastic';

/**
 * Index pairs to swap within each group of vis palette colors.
 * Moves red tones away from pink for better adjacent-color contrast.
 */
const COLOR_SWAP_PAIRS: Array<[number, number]> = [
  [6, 8], // red <-> yellow (dark tones)
  [7, 9], // light-red <-> light-yellow
];

/**
 * Swaps color pairs within each vis palette rotation to increase contrast
 * between adjacent hues (e.g., separating pink and red).
 */
export function swapColorPairs(colors: string[]): string[] {
  const result = [...colors];
  for (let groupStart = 0; groupStart < result.length; groupStart += visPaletteSize) {
    if (groupStart + visPaletteSize <= result.length) {
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
 * within each vis palette rotation.
 */
export function reorderDarkFirst(colors: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < colors.length; i += visPaletteSize) {
    const group = colors.slice(i, i + visPaletteSize);
    const dark = group.filter((_, idx) => idx % 2 === 0);
    const light = group.filter((_, idx) => idx % 2 !== 0);
    result.push(...dark, ...light);
  }
  return result;
}

export const elasticLineOptimizedPalette = new KbnColorFnPalette({
  id: KbnPalette.ElasticLineOptimized,
  type: 'categorical',
  aliases: [],
  colorCount: visPaletteSize,
  defaultNumberOfColors: 30,
  name: i18n.translate('palettes.elasticLineOptimized.name', {
    defaultMessage: 'Elastic (line optimized)',
  }),
  colorFn: (n) => {
    const base = reorderDarkFirst(swapColorPairs(euiPaletteColorBlind()));
    // Repeat the base vis colors without lightening on each rotation. In lines, lighter tones contrast is too low
    // + differences between rotations are hard to perceive.
    return Array.from({ length: n }, (_, i) => base[i % base.length]);
  },
});
