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
import { visPaletteSize } from './elastic';

const BASE = euiPaletteColorBlind({ rotations: 1 });

describe('swapColorPairs', () => {
  it('swaps red (index 6) with yellow (index 8) and their light variants', () => {
    const result = swapColorPairs(BASE);
    expect(result[6]).toBe(BASE[8]); // yellow dark moved to red position
    expect(result[8]).toBe(BASE[6]); // red dark moved to yellow position
    expect(result[7]).toBe(BASE[9]); // yellow light moved to red-light position
    expect(result[9]).toBe(BASE[7]); // red light moved to yellow-light position
  });

  it('leaves non-swapped indices unchanged', () => {
    const result = swapColorPairs(BASE);
    expect(result.slice(0, 6)).toEqual(BASE.slice(0, 6));
    expect(result.slice(10)).toEqual(BASE.slice(10));
  });

  it('applies swaps per group in multi-rotation palettes', () => {
    const baseTwoRotations = euiPaletteColorBlind({ rotations: 2 });
    const result = swapColorPairs(baseTwoRotations);
    expect(result[6]).toBe(baseTwoRotations[8]);
    expect(result[visPaletteSize + 6]).toBe(baseTwoRotations[visPaletteSize + 8]);
  });
});

describe('reorderDarkFirst', () => {
  it('places all dark tones (even indices) before light tones (odd indices)', () => {
    const result = reorderDarkFirst(BASE);
    const dark = BASE.filter((_, i) => i % 2 === 0);
    const light = BASE.filter((_, i) => i % 2 !== 0);
    expect(result).toEqual([...dark, ...light]);
  });

  it('preserves relative order within dark and light groups', () => {
    const result = reorderDarkFirst(BASE);
    const lastDarkIndex = visPaletteSize - 2;
    const lastLightIndex = visPaletteSize - 1;
    const darkCount = visPaletteSize / 2;
    expect(result[0]).toBe(BASE[0]); // first dark
    expect(result[darkCount - 1]).toBe(BASE[lastDarkIndex]); // last dark
    expect(result[darkCount]).toBe(BASE[1]); // first light
    expect(result[visPaletteSize - 1]).toBe(BASE[lastLightIndex]); // last light
  });
});
