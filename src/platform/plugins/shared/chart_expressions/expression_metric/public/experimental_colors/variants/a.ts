/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  DEFAULT_PARAMS,
  SURFACES,
  anchorHue,
  rampPosition,
  type Hex,
  type Mode,
} from '@kbn/contrast-roles';
import { createTargetsStore, targetsKey } from '../targets_store';
import type { Control, Variant } from '../types';
import { RAMP_PARAMS } from './ramp_params';

/** APCA Lc targets of variant A's tiles. */
export type ATargets = Readonly<{
  /** The tile's fill, against the surface. */
  fill: number;
  /** The value's text, against the fill. */
  ink: number;
}>;

export const DEFAULT_A_TARGETS: ATargets = { fill: 30, ink: 75 };

const aTargets = createTargetsStore('A', DEFAULT_A_TARGETS);

export interface ATileColors {
  fill: Hex;
  ink: Hex;
}

const resolve = (
  color: string,
  mode: Mode,
  ramp: boolean,
  { fill: fillLc, ink: inkLc }: ATargets
): ATileColors | undefined => {
  const anchored = anchorHue(color);
  if (!anchored) return undefined;
  const { model, angle } = anchored;
  const surface = SURFACES[mode];
  const p = DEFAULT_PARAMS;
  // Ramp colors keep their position along the ramp, from the ramp's first step up to the fill.
  const fill = ramp
    ? model.contrastColor(
        angle,
        p.ramp.from + rampPosition(color, mode) * (fillLc - p.ramp.from),
        surface,
        RAMP_PARAMS
      ).hex
    : model.contrastColor(angle, fillLc, surface, p).hex;
  return {
    fill,
    ink: model.contrastColor(angle, inkLc, surface, p, { against: fill, strict: true }).hex,
  };
};

const cache = new Map<string, ATileColors | undefined>();

/** A metric tile's variant A colors: a muted fill and the value in ink, or undefined for colors with no hue. */
export const aTileColors = (
  color: string,
  mode: Mode,
  ramp: boolean,
  targets: ATargets = DEFAULT_A_TARGETS
): ATileColors | undefined => {
  const key = [color, mode, ramp, targetsKey(targets)].join('|');
  if (cache.has(key)) return cache.get(key);
  const colors = resolve(color, mode, ramp, targets);
  cache.set(key, colors);
  return colors;
};

const controls: ReadonlyArray<Control<keyof ATargets>> = [
  {
    type: 'range',
    key: 'fill',
    label: i18n.translate('expressionMetricVis.experimentalColors.a.fillLabel', {
      defaultMessage: 'Fill',
    }),
    max: 100,
  },
  {
    type: 'range',
    key: 'ink',
    label: i18n.translate('expressionMetricVis.experimentalColors.a.inkLabel', {
      defaultMessage: 'Value',
    }),
    max: 106,
  },
];

/** Variant A: the regular chart, with a muted fill and the value in ink. Dark mode keeps the full color. */
export const variantA: Variant = {
  targets: aTargets,
  controls,
  tile: ({ color, noColor, mode, ramp, isBackground }) => {
    if (noColor || mode === 'dark' || !isBackground) return undefined;
    const colors = aTileColors(color, mode, ramp, aTargets.get());
    return colors && { fill: colors.fill, valueColor: colors.ink };
  },
};
