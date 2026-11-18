/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PARAMS, SURFACES, borealis, type Mode } from '@kbn/contrast-roles';
import { DYNAMIC_FILL_MAX_LC, TREND_LC, metricTileColors } from './metric_tile_colors';

const rolesOf = (name: string, mode: Mode) =>
  borealis.palettes(SURFACES[mode], DEFAULT_PARAMS).roles.find((r) => r.name === name)!;

describe('metricTileColors', () => {
  it('gives undefined for a gray', () => {
    expect(
      metricTileColors('#808080', 'light', { source: 'static', hasTrend: true })
    ).toBeUndefined();
    expect(
      metricTileColors('#808080', 'dark', { source: 'palette', hasTrend: false })
    ).toBeUndefined();
  });

  it.each(['light', 'dark'] as const)(
    'gives a static role color its hue roles on %s, from either mode',
    (mode) => {
      const roles = rolesOf('blue', mode);
      for (const color of [rolesOf('blue', 'light').faint, rolesOf('blue', 'dark').faint]) {
        expect(metricTileColors(color, mode, { source: 'static', hasTrend: true })).toEqual(
          expect.objectContaining({ fill: roles.faint, ink: roles.ink, border: roles.base })
        );
      }
    }
  );

  it('keeps the own hue of a custom picker color', () => {
    const custom = '#7B61FF';
    const asPick = metricTileColors(custom, 'light', { source: 'static', hasTrend: true });
    const asPalette = metricTileColors(custom, 'light', { source: 'palette', hasTrend: true });
    expect(asPick?.border).not.toBe(asPalette?.border);
  });

  it('fills the end of a ramp at DYNAMIC_FILL_MAX_LC and its start at faint', () => {
    const { angle } = rolesOf('blue', 'light');
    const ramp = borealis.palettes(SURFACES.light, DEFAULT_PARAMS).sequential('blue', 5);
    const at = (target: number) =>
      borealis.contrastColor(angle, target, SURFACES.light, DEFAULT_PARAMS).hex;
    const fillOf = (color: string) =>
      metricTileColors(color, 'light', { source: 'palette', hasTrend: true })?.fill;
    expect(fillOf(ramp[0])).toBe(at(DEFAULT_PARAMS.lc.faint));
    expect(fillOf(ramp[4])).toBe(at(DYNAMIC_FILL_MAX_LC));
  });

  it.each(['light', 'dark'] as const)('solves ink and trend against the fill on %s', (mode) => {
    const { angle, base } = rolesOf('teal', mode);
    const surface = SURFACES[mode];
    const colors = metricTileColors(base, mode, { source: 'palette', hasTrend: true })!;
    const against = (target: number, strict: boolean) =>
      borealis.contrastColor(angle, target, surface, DEFAULT_PARAMS, colors.fill, null, strict).hex;
    expect(colors.ink).toBe(against(DEFAULT_PARAMS.lc.ink, true));
    expect(colors.trend).toBe(against(TREND_LC, false));
    expect(colors.trend).not.toBe(
      borealis.contrastColor(angle, TREND_LC, surface, DEFAULT_PARAMS).hex
    );
  });

  it.each(['static', 'palette'] as const)('boosts fill and ink without a trend (%s)', (source) => {
    const color = rolesOf('pink', 'light').base;
    const withTrend = metricTileColors(color, 'light', { source, hasTrend: true })!;
    const withoutTrend = metricTileColors(color, 'light', { source, hasTrend: false })!;
    expect(withoutTrend.fill).not.toBe(withTrend.fill);
    expect(withoutTrend.ink).not.toBe(withTrend.ink);
    expect(withoutTrend.border).toBe(withTrend.border);
  });
});
