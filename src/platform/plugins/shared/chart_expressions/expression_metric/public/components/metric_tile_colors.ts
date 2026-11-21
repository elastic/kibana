/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { easing } from 'ts-easing';
import {
  DEFAULT_PARAMS,
  SURFACES,
  anchorHue,
  rampPosition,
  type Hex,
  type Mode,
  type Params,
} from '@kbn/contrast-roles';

/** APCA Lc of the trend's area color against the tile's fill. */
export const TREND_LC = 50;
/** APCA Lc of the line along the top of the trend's area, against the tile's fill. */
export const TREND_LINE_LC = 30;
/** The trend's area: Lens's gradient area fill at 2/3 of its opacity, so it costs the value less contrast. */
export const TREND_OPACITY = 2 / 3;
// Lens's stacked area gradient (expression_xy's data_layers.tsx): 12 stops, eased from 0.1 at the bottom to 0.4 at the top.
const TREND_GRADIENT_START = 0.1 * TREND_OPACITY;
const TREND_GRADIENT_END = 0.4 * TREND_OPACITY;
const TREND_GRADIENT_STOP_COUNT = 12;
export const TREND_GRADIENT_STOPS = Array.from({ length: TREND_GRADIENT_STOP_COUNT }, (_, i) => {
  const offset = i / (TREND_GRADIENT_STOP_COUNT - 1);
  return {
    offset,
    opacity:
      TREND_GRADIENT_START + (TREND_GRADIENT_END - TREND_GRADIENT_START) * easing.inOutSine(offset),
  };
});
// The value can sit on the most opaque part of the trend's area.
const TREND_BEHIND_VALUE_OPACITY = Math.max(...TREND_GRADIENT_STOPS.map(({ opacity }) => opacity));
/** APCA Lc of the darkest fill dynamic coloring reaches, at the end of its ramp. */
export const DYNAMIC_FILL_MAX_LC = 15;
/** Ramp fills are steps of one color rather than roles, so they keep the workbench's taper. */
export const RAMP_PARAMS: Params = {
  ...DEFAULT_PARAMS,
  chroma: { ...DEFAULT_PARAMS.chroma, taper: 0.5 },
};
/** APCA Lc of a colored value at the start of a ramp, against the surface. Values reach ink at the ramp's end. */
export const VALUE_RAMP_MIN_LC = 50;
/** Extra Lc for the fill and value of tiles without a trend. 0 turns the boost off. */
export const NO_TREND_EXTRA_LC = { faint: 3, ink: 5 } as const;

export interface MetricTileColors {
  fill: Hex;
  ink: Hex;
  border: Hex;
  trend: Hex;
  trendLine: Hex;
}

export interface MetricTileOptions {
  /** The color is a step of dynamic coloring by one hue's ramp, so the fill keeps its position along the ramp. */
  ramp: boolean;
  hasTrend: boolean;
}

const resolve = (
  color: string,
  mode: Mode,
  { ramp, hasTrend }: MetricTileOptions
): MetricTileColors | undefined => {
  const anchored = anchorHue(color);
  if (!anchored) return undefined;
  const { model, angle } = anchored;
  const surface = SURFACES[mode];
  const p = DEFAULT_PARAMS;
  const { lc } = p;
  const extra = hasTrend ? { faint: 0, ink: 0 } : NO_TREND_EXTRA_LC;

  const fill = ramp
    ? model.contrastColor(
        angle,
        lc.faint + rampPosition(color, mode) * (DYNAMIC_FILL_MAX_LC - lc.faint) + extra.faint,
        surface,
        RAMP_PARAMS
      ).hex
    : model.rolesAt(angle, surface, { ...p, lc: { ...lc, faint: lc.faint + extra.faint } }).faint;

  // Strict, like ink: a light base's correction would pull the trend toward the fill (a pale yellow's to about Lc 20).
  const trend = model.contrastColor(angle, TREND_LC, surface, p, fill, null, true).hex;
  // The value is drawn over the trend, so its contrast is measured against both.
  const behindValue = hasTrend ? blend(trend, fill, TREND_BEHIND_VALUE_OPACITY) : fill;

  return {
    fill,
    ink: model.contrastColor(angle, lc.ink + extra.ink, surface, p, behindValue, null, true).hex,
    border: model.baseColor(angle, surface, p).hex,
    trend,
    trendLine: model.contrastColor(angle, TREND_LINE_LC, surface, p, fill, null, true).hex,
  };
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

const cache = new Map<string, MetricTileColors | undefined>();

/** A metric tile's subdued colors, with its color as their base, or undefined for colors with no hue. */
export const metricTileColors = (
  color: string,
  mode: Mode,
  opts: MetricTileOptions
): MetricTileColors | undefined => {
  const key = [color, mode, opts.ramp, opts.hasTrend].join('|');
  if (cache.has(key)) return cache.get(key);
  const colors = resolve(color, mode, opts);
  cache.set(key, colors);
  return colors;
};

const resolveValue = (color: string, mode: Mode, ramp: boolean): Hex | undefined => {
  const anchored = anchorHue(color);
  if (!anchored) return undefined;
  const { model, angle } = anchored;
  const surface = SURFACES[mode];
  const p = DEFAULT_PARAMS;
  const { ink } = p.lc;
  // Ramp colors keep their position along the ramp, so the values still tell the ramp's steps apart.
  const target = ramp
    ? VALUE_RAMP_MIN_LC + rampPosition(color, mode) * (ink - VALUE_RAMP_MIN_LC)
    : ink;
  return model.contrastColor(angle, target, surface, p, surface, null, true).hex;
};

const valueCache = new Map<string, Hex | undefined>();

/** A colored value's text color: ink with its color as the base, or undefined for colors with no hue. */
export const metricValueColor = (color: string, mode: Mode, ramp: boolean): Hex | undefined => {
  const key = [color, mode, ramp].join('|');
  if (valueCache.has(key)) return valueCache.get(key);
  const value = resolveValue(color, mode, ramp);
  valueCache.set(key, value);
  return value;
};
