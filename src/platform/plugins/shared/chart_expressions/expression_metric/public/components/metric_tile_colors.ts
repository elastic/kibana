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
  matchHue,
  rampPosition,
  type Hex,
  type Mode,
} from '@kbn/contrast-roles';

/** APCA Lc of the trend sparkline against the tile's fill. */
export const TREND_LC = 50;
/** APCA Lc of the darkest fill dynamic coloring reaches, at the end of its ramp. */
export const DYNAMIC_FILL_MAX_LC = 15;
/** Extra Lc for the fill and value of tiles without a trend. 0 turns the boost off. */
export const NO_TREND_EXTRA_LC = { faint: 3, ink: 5 } as const;

export interface MetricTileColors {
  fill: Hex;
  ink: Hex;
  border: Hex;
  trend: Hex;
}

export interface MetricTileOptions {
  /** 'static': a single color; 'palette': a color from dynamic coloring by value. */
  source: 'static' | 'palette';
  hasTrend: boolean;
}

const resolve = (
  color: string,
  mode: Mode,
  { source, hasTrend }: MetricTileOptions
): MetricTileColors | undefined => {
  const match = matchHue(color, source === 'palette' ? 'nearest' : 'exact');
  if (!match) return undefined;
  const { model, angle } = match;
  const surface = SURFACES[mode];
  const p = DEFAULT_PARAMS;
  const { lc } = p;
  const extra = hasTrend ? { faint: 0, ink: 0 } : NO_TREND_EXTRA_LC;

  // Palette colors keep their position along the ramp; static colors take their hue's faint.
  const fill =
    source === 'palette'
      ? model.contrastColor(
          angle,
          lc.faint + rampPosition(color, mode) * (DYNAMIC_FILL_MAX_LC - lc.faint) + extra.faint,
          surface,
          p
        ).hex
      : model.rolesAt(angle, surface, { ...p, lc: { ...lc, faint: lc.faint + extra.faint } }).faint;

  return {
    fill,
    ink: model.contrastColor(angle, lc.ink + extra.ink, surface, p, fill, null, true).hex,
    border: model.baseColor(angle, surface, p).hex,
    trend: model.contrastColor(angle, TREND_LC, surface, p, fill).hex,
  };
};

const cache = new Map<string, MetricTileColors | undefined>();

/** A metric tile's subdued colors for its color on the mode's surface, or undefined for colors with no hue. */
export const metricTileColors = (
  color: string,
  mode: Mode,
  opts: MetricTileOptions
): MetricTileColors | undefined => {
  const key = [color, mode, opts.source, opts.hasTrend].join('|');
  if (cache.has(key)) return cache.get(key);
  const colors = resolve(color, mode, opts);
  cache.set(key, colors);
  return colors;
};
