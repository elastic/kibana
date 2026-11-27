/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PARAMS, SURFACES, apcaLc, borealis, contrast } from '@kbn/contrast-roles';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import {
  DEFAULT_B_TARGETS,
  TREND_BEHIND_VALUE_OPACITY,
  blend,
  metricTileColors,
  metricValueColor,
  neutralTrendColors,
} from './colors';

describe('metricTileColors', () => {
  it('gives undefined for a gray', () => {
    expect(metricTileColors('#808080', 'light', { ramp: false, hasTrend: true })).toBeUndefined();
    expect(metricValueColor('#808080', 'light', false)).toBeUndefined();
  });

  it.each(['light', 'dark'] as const)("gives a theme hue the theme's roles on %s", (mode) => {
    const light = borealis.palettes(SURFACES.light, DEFAULT_PARAMS).roles[1];
    const { faint, base } = borealis.palettes(SURFACES[mode], DEFAULT_PARAMS).roles[1];
    const targets = { ...DEFAULT_B_TARGETS, fill: DEFAULT_PARAMS.lc.faint, fillTaper: 100 };
    expect(metricTileColors(light.base, mode, { ramp: false, hasTrend: true, targets })).toEqual(
      expect.objectContaining({ fill: faint, border: base })
    );
  });

  it("keeps a pale base's trend at its contrast against the fill", () => {
    const { fill, trend } = metricTileColors('#FCD883', 'light', { ramp: false, hasTrend: true })!;
    expect(Math.abs(apcaLc(trend, fill))).toBeGreaterThanOrEqual(DEFAULT_B_TARGETS.trend - 1);
  });

  it('keeps the trend at its contrast while lowering its taper', () => {
    const trendAt = (trendTaper: number) =>
      metricTileColors('#F6726A', 'light', {
        ramp: false,
        hasTrend: true,
        targets: { ...DEFAULT_B_TARGETS, trendTaper },
      })!;
    const plain = trendAt(100);
    const vivid = trendAt(0);
    expect(vivid.trend).not.toBe(plain.trend);
    expect(Math.abs(apcaLc(vivid.trend, vivid.fill))).toBeCloseTo(DEFAULT_B_TARGETS.trend, -0.5);
  });

  it('keeps the fill at its contrast while lowering its taper', () => {
    const fillAt = (fillTaper: number) =>
      metricTileColors('#F6726A', 'dark', {
        ramp: false,
        hasTrend: true,
        targets: { ...DEFAULT_B_TARGETS, fill: 20, fillTaper },
      })!.fill;
    expect(fillAt(0)).not.toBe(fillAt(100));
    expect(Math.abs(apcaLc(fillAt(0), SURFACES.dark))).toBeCloseTo(20, -0.5);
  });

  it('turns the marks on a light fill dark on dark, where light ones fall short', () => {
    const lightness = (hex: string) => Math.abs(apcaLc('#000000', hex));
    const { fill, ink, trend } = metricTileColors('#16C5C0', 'dark', {
      ramp: false,
      hasTrend: true,
      targets: { ...DEFAULT_B_TARGETS, fill: 72 },
    })!;
    expect(lightness(ink)).toBeLessThan(lightness(fill));
    expect(lightness(trend)).toBeLessThan(lightness(fill));
    expect(Math.abs(apcaLc(trend, fill))).toBeCloseTo(DEFAULT_B_TARGETS.trend, -0.5);
  });

  describe.each(['light', 'dark'] as const)('the value on %s', (mode) => {
    const lightness = (hex: string) => Math.abs(apcaLc('#000000', hex));
    const tileAt = (fill: number, hasTrend: boolean) =>
      metricTileColors('#F6726A', mode, {
        ramp: false,
        hasTrend,
        targets: { ...DEFAULT_B_TARGETS, fill, fillInk: 0 },
      })!;
    it('goes toward the far end and just reaches 3:1 against the fill and the trend behind it', () => {
      const tile = tileAt(15, true);
      const behind = blend(tile.trend, tile.fill, TREND_BEHIND_VALUE_OPACITY);
      const ratio = Math.min(contrast(tile.ink, tile.fill), contrast(tile.ink, behind));
      expect(lightness(tile.ink) > lightness(tile.fill)).toBe(mode === 'dark');
      expect(ratio).toBeGreaterThanOrEqual(3);
      expect(ratio).toBeLessThan(3.2);
    });

    it('is the same on a tile without a trend', () => {
      expect(tileAt(25, false).ink).toBe(tileAt(25, true).ink);
      expect(tileAt(10, false).ink).toBe(tileAt(10, true).ink);
    });
  });

  it('pushes the value past 3:1 to its fill target, as far as the fill allows', () => {
    const inkAt = (fillInk: number) =>
      metricTileColors('#FCD883', 'dark', {
        ramp: false,
        hasTrend: true,
        targets: { ...DEFAULT_B_TARGETS, fill: 35, fillInk },
      })!;
    const plain = inkAt(0);
    const pushed = inkAt(45);
    expect(contrast(pushed.ink, pushed.fill)).toBeGreaterThan(contrast(plain.ink, plain.fill));
    expect(Math.abs(apcaLc(pushed.ink, pushed.fill))).toBeGreaterThanOrEqual(44.5);
  });

  it("uses Borealis' heading text colors for the value when neutral", () => {
    const inkAt = (fill: number) =>
      metricTileColors('#F6726A', 'dark', {
        ramp: false,
        hasTrend: true,
        targets: { ...DEFAULT_B_TARGETS, fill, neutralInk: true },
      })!.ink;
    expect(inkAt(35)).toBe(euiLightVars.euiColorTextHeading);
    expect(inkAt(6)).toBe(euiDarkVars.euiColorTextHeading);
  });

  it('turns the value dark on dark where light can not reach 3:1', () => {
    const lightness = (hex: string) => Math.abs(apcaLc('#000000', hex));
    const { fill, ink, trend } = metricTileColors('#F6726A', 'dark', {
      ramp: false,
      hasTrend: false,
      targets: { ...DEFAULT_B_TARGETS, fill: 72, fillInk: 0 },
    })!;
    const behind = blend(trend, fill, TREND_BEHIND_VALUE_OPACITY);
    const ratio = Math.min(contrast(ink, fill), contrast(ink, behind));
    expect(lightness(ink)).toBeLessThan(lightness(fill));
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThan(3.2);
  });

  it('turns the trend lighter on dark while it reaches its targets, under a dark value too', () => {
    const lightness = (hex: string) => Math.abs(apcaLc('#000000', hex));
    const { fill, ink, trend, trendLine } = metricTileColors('#F6726A', 'dark', {
      ramp: false,
      hasTrend: true,
      targets: { ...DEFAULT_B_TARGETS, fill: 35 },
    })!;
    expect(lightness(ink)).toBeLessThan(lightness(fill));
    expect(lightness(trend)).toBeGreaterThan(lightness(fill));
    expect(lightness(trendLine)).toBeGreaterThan(lightness(fill));
    expect(Math.abs(apcaLc(trend, fill))).toBeCloseTo(DEFAULT_B_TARGETS.trend, -0.5);
    expect(Math.abs(apcaLc(trendLine, fill))).toBeCloseTo(DEFAULT_B_TARGETS.trendLine, -0.5);
  });

  it('uses the given targets', () => {
    const targets = { ...DEFAULT_B_TARGETS, fill: 30 };
    const { fill } = metricTileColors('#61A2FF', 'light', {
      ramp: false,
      hasTrend: true,
      targets,
    })!;
    expect(Math.abs(apcaLc(fill, SURFACES.light))).toBeGreaterThanOrEqual(29);
    expect(metricTileColors('#61A2FF', 'light', { ramp: false, hasTrend: true })!.fill).not.toBe(
      fill
    );
  });

  it.each(['light', 'dark'] as const)(
    'gives a tile with no hue a neutral trend at its contrasts on %s',
    (mode) => {
      const background = SURFACES[mode];
      const { trend, trendLine } = neutralTrendColors(background, mode);
      expect(Math.abs(apcaLc(trend, background))).toBeGreaterThanOrEqual(
        DEFAULT_B_TARGETS.trend - 1
      );
      expect(Math.abs(apcaLc(trendLine, background))).toBeGreaterThanOrEqual(
        DEFAULT_B_TARGETS.trendLine - 1
      );
    }
  );

  it('blends in sRGB', () => {
    expect(blend('#FFFFFF', '#000000', 0.5)).toBe('#808080');
  });
});
