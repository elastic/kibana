/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SURFACES, apcaLc } from '@kbn/contrast-roles';
import { DEFAULT_A_TARGETS, aTileColors, variantA } from './a';

describe('variant A', () => {
  it('gives the fill and value their contrasts', () => {
    const { fill, ink } = aTileColors('#61A2FF', 'light', false)!;
    expect(Math.abs(apcaLc(fill, SURFACES.light))).toBeCloseTo(DEFAULT_A_TARGETS.fill, 0);
    // On a Lc 30 blue even black falls short of Lc 75, so the value gets close to the most the fill allows.
    const reachable = Math.min(DEFAULT_A_TARGETS.ink, apcaLc('#000000', fill));
    expect(Math.abs(apcaLc(ink, fill))).toBeGreaterThanOrEqual(reachable - 3);
  });

  it('keeps the chart colors in dark mode and on value-colored tiles', () => {
    const input = { color: '#61A2FF', noColor: false, ramp: false, hasTrend: false };
    expect(variantA.tile({ ...input, mode: 'dark', isBackground: true })).toBeUndefined();
    expect(variantA.tile({ ...input, mode: 'light', isBackground: false })).toBeUndefined();
    expect(variantA.tile({ ...input, mode: 'light', isBackground: true })).toEqual({
      fill: aTileColors('#61A2FF', 'light', false)?.fill,
      valueColor: aTileColors('#61A2FF', 'light', false)?.ink,
    });
  });
});
