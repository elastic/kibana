/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { swapColorPairs, reorderDarkFirst } from './elastic_line_optimized';

const BASE_10 = euiPaletteColorBlind({ rotations: 1 });

describe('swapColorPairs', () => {
  it('swaps red (index 6) with yellow (index 8) and their light variants', () => {
    const result = swapColorPairs(BASE_10);
    expect(result[6]).toBe(BASE_10[8]); // yellow dark moved to red position
    expect(result[8]).toBe(BASE_10[6]); // red dark moved to yellow position
    expect(result[7]).toBe(BASE_10[9]); // yellow light moved to red-light position
    expect(result[9]).toBe(BASE_10[7]); // red light moved to yellow-light position
  });

  it('leaves non-swapped indices unchanged', () => {
    const result = swapColorPairs(BASE_10);
    expect(result.slice(0, 6)).toEqual(BASE_10.slice(0, 6));
  });

  it('applies swaps per group in multi-rotation palettes', () => {
    const base20 = euiPaletteColorBlind({ rotations: 2 });
    const result = swapColorPairs(base20);
    expect(result[6]).toBe(base20[8]);
    expect(result[16]).toBe(base20[18]);
  });
});

describe('reorderDarkFirst', () => {
  it('places all dark tones (even indices) before light tones (odd indices)', () => {
    const result = reorderDarkFirst(BASE_10);
    const dark = BASE_10.filter((_, i) => i % 2 === 0);
    const light = BASE_10.filter((_, i) => i % 2 !== 0);
    expect(result).toEqual([...dark, ...light]);
  });

  it('preserves relative order within dark and light groups', () => {
    const result = reorderDarkFirst(BASE_10);
    expect(result[0]).toBe(BASE_10[0]); // first dark
    expect(result[4]).toBe(BASE_10[8]); // last dark
    expect(result[5]).toBe(BASE_10[1]); // first light
    expect(result[9]).toBe(BASE_10[9]); // last light
  });
});
