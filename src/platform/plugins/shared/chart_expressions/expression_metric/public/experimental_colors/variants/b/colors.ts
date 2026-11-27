/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_PARAMS,
  SURFACES,
  anchorHue,
  apcaLc,
  contrast,
  borealis,
  rampPosition,
  type Hex,
  type Mode,
  type Params,
} from '@kbn/contrast-roles';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import { targetsKey } from '../../targets_store';

/** APCA Lc targets and trend options of variant B's tiles. */
export type BTargets = Readonly<{
  /** The tile's fill, against the surface. */
  fill: number;
  /** A colored value's text, against the surface. */
  ink: number;
  /** The value's text on a fill, against it. Never below WCAG's large-text AA. */
  fillInk: number;
  /** The value's text on a fill in Borealis' heading colors, rather than the fill's hue. */
  neutralInk: boolean;
  /** The trend's area color, against the fill. */
  trend: number;
  /** The line along the top of the trend's area, against the fill. */
  trendLine: number;
  /** The darkest fill dynamic coloring reaches, at the end of its ramp. */
  dynamicFillMax: number;
  /** A colored value at the start of a ramp, against the surface. It reaches `ink` at the end. */
  valueRampMin: number;
  /** Extra Lc for the fill of tiles without a trend. */
  noTrendExtraFill: number;
  /** Draws the line along the top of the trend's area. */
  showTrendLine: boolean;
  /** Fades the trend's area from bottom to top. Off, it's flat. */
  trendGradient: boolean;
}>;

export const DEFAULT_B_TARGETS: BTargets = {
  fill: 6,
  ink: DEFAULT_PARAMS.lc.ink,
  fillInk: 75,
  neutralInk: false,
  trend: 24,
  trendLine: 30,
  dynamicFillMax: 15,
  valueRampMin: 50,
  noTrendExtraFill: 0,
  showTrendLine: true,
  trendGradient: true,
};

// Chroma tapers as percentages of the usual ones: higher is duller. The trend is semi-transparent over the fill, so
// it can be more colorful than the fill.
const FILL_TAPER = 140;
const TREND_TAPER = 100;
const tapered = (percent: number): Params => ({
  ...DEFAULT_PARAMS,
  chroma: {
    ...DEFAULT_PARAMS.chroma,
    taper: (DEFAULT_PARAMS.chroma.taper * percent) / 100,
    taperDark: (DEFAULT_PARAMS.chroma.taperDark * percent) / 100,
  },
});
const FILL_PARAMS = tapered(FILL_TAPER);
const TREND_PARAMS = tapered(TREND_TAPER);

/** The trend's area: Lens's gradient area fill at 2/3 of its opacity, so it costs the value less contrast. */
export const TREND_OPACITY = 2 / 3;
export const TREND_GRADIENT_STOPS = [
  { offset: 0, opacity: 0.1 * TREND_OPACITY },
  { offset: 1, opacity: 0.7 * TREND_OPACITY },
];
// Slack for the solver's rounding.
const TARGET_TOLERANCE = 0.5;
// WCAG 2 AA for large text (1.4.3), which the value always is.
const WCAG_LARGE_TEXT_AA = 3;
// Swapped on purpose: light text toward the light end is the dark theme's.
const NEUTRAL_INK: Readonly<Record<Mode, Hex>> = {
  dark: euiLightVars.euiColorTextHeading,
  light: euiDarkVars.euiColorTextHeading,
};
const MAX_LC = 106;
// About 0.1 Lc precision.
const SEARCH_STEPS = 10;

// The value can sit on the most opaque part of the trend's area.
export const TREND_BEHIND_VALUE_OPACITY = Math.max(
  ...TREND_GRADIENT_STOPS.map(({ opacity }) => opacity)
);

export interface TrendColors {
  trend: Hex;
  trendLine: Hex;
}

export interface MetricTileColors extends TrendColors {
  fill: Hex;
  ink: Hex;
  /** The progress bar: the hue's base. */
  bar: Hex;
}

export interface MetricTileOptions {
  /** The color is a step of a single-hue ramp. */
  ramp: boolean;
  hasTrend: boolean;
  targets?: BTargets;
}

// The near end only when the far end falls short and the near end less so.
const towardFarEnd = <T>(
  mode: Mode,
  colorsToward: (toward: Mode) => T,
  shortfall: (colors: T) => number
): T => {
  const far = colorsToward(mode === 'dark' ? 'light' : 'dark');
  if (shortfall(far) === 0) return far;
  const near = colorsToward(mode);
  return shortfall(near) < shortfall(far) ? near : far;
};

const memoize = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  key: (...args: Args) => string
): ((...args: Args) => Result) => {
  const cache = new Map<string, Result>();
  return (...args) => {
    const k = key(...args);
    if (!cache.has(k)) cache.set(k, fn(...args));
    return cache.get(k) as Result;
  };
};

const resolve = (
  color: string,
  mode: Mode,
  { ramp, hasTrend, targets = DEFAULT_B_TARGETS }: MetricTileOptions
): MetricTileColors | undefined => {
  const anchored = anchorHue(color);
  if (!anchored) return undefined;
  const { model, angle } = anchored;
  const surface = SURFACES[mode];
  const p = DEFAULT_PARAMS;
  const extraFill = hasTrend ? 0 : targets.noTrendExtraFill;

  const fill = ramp
    ? model.contrastColor(
        angle,
        targets.fill +
          rampPosition(color, mode) * (targets.dynamicFillMax - targets.fill) +
          extraFill,
        surface,
        FILL_PARAMS
      ).hex
    : model.rolesAt(angle, surface, {
        ...FILL_PARAMS,
        lc: { ...p.lc, faint: targets.fill + extraFill },
      }).faint;

  const trendToward = (toward: Mode) => {
    // Without `exact`, a mark on the fill gets the hue's full correction.
    const onFill = (target: number) =>
      model.contrastColor(angle, target, surface, TREND_PARAMS, {
        against: fill,
        polarity: toward,
        exact: true,
      }).hex;
    const trend = onFill(targets.trend);
    const trendLine = onFill(targets.trendLine);
    const shortfall =
      Math.max(0, targets.trend - Math.abs(apcaLc(trend, fill))) +
      Math.max(0, targets.trendLine - Math.abs(apcaLc(trendLine, fill)));
    return { trend, trendLine, shortfall };
  };
  // Toward the far end, it adds to the value's contrast.
  const { trend, trendLine } = towardFarEnd(mode, trendToward, ({ shortfall }) =>
    shortfall > TARGET_TOLERANCE ? shortfall : 0
  );

  // The value may sit over the trend. Every tile is measured this way, so values match across tiles.
  const behindValue = blend(trend, fill, TREND_BEHIND_VALUE_OPACITY);
  const ratio = (hex: Hex) => Math.min(contrast(hex, fill), contrast(hex, behindValue));
  // Just enough for WCAG's large-text AA, then up to fillInk, or as far as the fill allows.
  const inkToward = (toward: Mode): Hex => {
    if (targets.neutralInk) return NEUTRAL_INK[toward];
    const solve = (target: number) =>
      model.contrastColor(angle, target, surface, p, {
        against: fill,
        strict: true,
        polarity: toward,
      }).hex;
    const farthest = solve(MAX_LC);
    if (ratio(farthest) < WCAG_LARGE_TEXT_AA) return farthest;
    let [short, enough] = [0, MAX_LC];
    for (let step = 0; step < SEARCH_STEPS; step++) {
      const mid = (short + enough) / 2;
      if (ratio(solve(mid)) >= WCAG_LARGE_TEXT_AA) enough = mid;
      else short = mid;
    }
    return solve(Math.max(enough, targets.fillInk));
  };
  const ink = towardFarEnd(mode, inkToward, (hex) => Math.max(0, WCAG_LARGE_TEXT_AA - ratio(hex)));

  return { fill, ink, bar: model.baseColor(angle, surface, p).hex, trend, trendLine };
};

const channels = (hex: Hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** `top` at `opacity` over `bottom`, composited in sRGB as the browser does. */
export const blend = (top: Hex, bottom: Hex, opacity: number): Hex => {
  const under = channels(bottom);
  return `#${channels(top)
    .map((c, i) => Math.round(c * opacity + under[i] * (1 - opacity)))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

/** A metric tile's subdued colors, with its color as their base, or undefined for colors with no hue. */
export const metricTileColors = memoize(
  resolve,
  (color, mode, { ramp, hasTrend, targets = DEFAULT_B_TARGETS }) =>
    [color, mode, ramp, hasTrend, targetsKey(targets)].join('|')
);

/** The trend's colors for a tile with no hue, in the theme's neutral tint, over `background`. */
export const neutralTrendColors = memoize(
  (
    background: Hex,
    mode: Mode,
    { trend, trendLine }: BTargets = DEFAULT_B_TARGETS
  ): TrendColors => {
    const surface = SURFACES[mode];
    const p = DEFAULT_PARAMS;
    return {
      trend: borealis.contrastColor(null, trend, surface, p, { against: background }).hex,
      trendLine: borealis.contrastColor(null, trendLine, surface, p, { against: background }).hex,
    };
  },
  (background, mode, { trend, trendLine } = DEFAULT_B_TARGETS) =>
    [background, mode, trend, trendLine].join('|')
);

const resolveValue = (
  color: string,
  mode: Mode,
  ramp: boolean,
  { ink, valueRampMin }: BTargets = DEFAULT_B_TARGETS
): Hex | undefined => {
  const anchored = anchorHue(color);
  if (!anchored) return undefined;
  const { model, angle } = anchored;
  const surface = SURFACES[mode];
  const p = DEFAULT_PARAMS;
  // So values still tell the ramp's steps apart.
  const target = ramp ? valueRampMin + rampPosition(color, mode) * (ink - valueRampMin) : ink;
  return model.contrastColor(angle, target, surface, p, { strict: true }).hex;
};

/** A colored value's text color: ink with its color as the base, or undefined for colors with no hue. */
export const metricValueColor = memoize(
  resolveValue,
  (color, mode, ramp, targets = DEFAULT_B_TARGETS) =>
    [color, mode, ramp, targetsKey(targets)].join('|')
);
