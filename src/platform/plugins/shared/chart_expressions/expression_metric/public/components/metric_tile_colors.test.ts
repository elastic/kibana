/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PARAMS, SURFACES, apcaLc, borealis } from '@kbn/contrast-roles';
import { TREND_LC, blend, metricTileColors, metricValueColor } from './metric_tile_colors';

describe('metricTileColors', () => {
  it('gives undefined for a gray', () => {
    expect(metricTileColors('#808080', 'light', { ramp: false, hasTrend: true })).toBeUndefined();
    expect(metricValueColor('#808080', 'light', false)).toBeUndefined();
  });

  it.each(['light', 'dark'] as const)("gives a theme hue the theme's roles on %s", (mode) => {
    const light = borealis.palettes(SURFACES.light, DEFAULT_PARAMS).roles[1];
    const { faint, base } = borealis.palettes(SURFACES[mode], DEFAULT_PARAMS).roles[1];
    expect(metricTileColors(light.base, mode, { ramp: false, hasTrend: true })).toEqual(
      expect.objectContaining({ fill: faint, border: base })
    );
  });

  it("keeps a pale base's trend at its contrast against the fill", () => {
    const { fill, trend } = metricTileColors('#FCD883', 'light', { ramp: false, hasTrend: true })!;
    expect(Math.abs(apcaLc(trend, fill))).toBeGreaterThanOrEqual(TREND_LC - 1);
  });

  it('blends in sRGB', () => {
    expect(blend('#FFFFFF', '#000000', 0.5)).toBe('#808080');
  });
});
