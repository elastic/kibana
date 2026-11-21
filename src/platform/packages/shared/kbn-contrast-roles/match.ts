/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatHex, parse } from 'culori';
import { BOREALIS_THEME, SURFACES, type Mode } from './borealis';
import {
  DEFAULT_PARAMS,
  apcaLc,
  createContrastRoles,
  hexToOklch,
  type ContrastRoles,
  type Hex,
} from './src';

/** A color as the base of its own hue: the model that solves its roles, and the angle to solve them at. */
export interface AnchoredHue {
  model: ContrastRoles;
  angle: number;
}

// Below this chroma a color has no hue to anchor.
const MIN_HUE_CHROMA = 0.02;
// Most a single-hue ramp's colors spread in hue.
const MAX_RAMP_HUE_SPREAD = 20;

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const toHex = (color: string): Hex | undefined => {
  const parsed = parse(color);
  return parsed && formatHex(parsed).toUpperCase();
};

const hueOf = (color: string): number | undefined => {
  const hex = toHex(color);
  if (!hex) return undefined;
  const { C, h } = hexToOklch(hex);
  return C < MIN_HUE_CHROMA ? undefined : h;
};

const anchors = new Map<Hex, AnchoredHue>();

/** The color as the base of its own hue on Borealis's surfaces, or undefined for colors with no hue or that can't be parsed. */
export const anchorHue = (color: string): AnchoredHue | undefined => {
  const hex = toHex(color);
  if (!hex || hueOf(hex) === undefined) return undefined;
  const cached = anchors.get(hex);
  if (cached) return cached;
  const model = createContrastRoles({ ...BOREALIS_THEME, hues: [{ name: hex, base: hex }] });
  const anchored = { model, angle: model.hues[0].angle };
  anchors.set(hex, anchored);
  return anchored;
};

/** Whether colors are one hue's ramp: every color with a hue sits within a few degrees of the others. */
export const isSingleHueRamp = (colors: string[]): boolean => {
  const hues = colors.map(hueOf).filter((h): h is number => h !== undefined);
  if (!hues.length) return false;
  return hues.every((a) => hues.every((b) => hueDistance(a, b) <= MAX_RAMP_HUE_SPREAD));
};

/** A color's position along the ramp, 0 to 1: its APCA Lc against the mode's surface, between `ramp.from` and `ramp.to`. */
export const rampPosition = (color: string, mode: Mode): number => {
  const hex = toHex(color);
  if (!hex) return 0;
  const { ramp } = DEFAULT_PARAMS;
  return clamp01((Math.abs(apcaLc(hex, SURFACES[mode])) - ramp.from) / (ramp.to - ramp.from));
};
