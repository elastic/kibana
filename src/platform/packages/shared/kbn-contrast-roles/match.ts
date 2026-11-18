/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatHex, parse } from 'culori';
import { borealis, borealisStatus, SURFACES, type Mode } from './borealis';
import { DEFAULT_PARAMS, ROLES, apcaLc, hexToOklch, type ContrastRoles, type Hex } from './src';

/** A hue to solve role colors at, and the model that solves them. */
export interface HueMatch {
  model: ContrastRoles;
  angle: number;
}

/**
 * 'exact': a role color's own theme hue, otherwise the color's own hue (a picker color keeps its hue).
 * 'nearest': the closest theme hue (palette colors).
 */
export type HueSnap = 'exact' | 'nearest';

// Below this chroma a color has no hue to match.
const MIN_HUE_CHROMA = 0.02;

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const toHex = (color: string): Hex | undefined => {
  const parsed = parse(color);
  return parsed && formatHex(parsed).toUpperCase();
};

interface HueEntry extends HueMatch {
  colors: Set<string>;
}

let hueEntries: HueEntry[] | undefined;

// Every theme hue of borealis and borealisStatus, with its role colors in both modes.
const getHueEntries = (): HueEntry[] => {
  if (hueEntries) return hueEntries;
  hueEntries = [borealis, borealisStatus].flatMap((model) =>
    model.hues.map(({ angle }) => {
      const colors = new Set<string>();
      for (const surface of Object.values(SURFACES)) {
        const roles = model.rolesAt(angle, surface, DEFAULT_PARAMS);
        ROLES.forEach((k) => colors.add(roles[k].toUpperCase()));
      }
      return { model, angle, colors };
    })
  );
  return hueEntries;
};

/** The hue to solve a color's roles at, or undefined for colors with no hue or that can't be parsed. */
export const matchHue = (color: string, snap: HueSnap): HueMatch | undefined => {
  const hex = toHex(color);
  if (!hex) return undefined;
  const entries = getHueEntries();

  // Before the chroma check: some faints are below it.
  const exact = snap === 'exact' && entries.find(({ colors }) => colors.has(hex));
  if (exact) return { model: exact.model, angle: exact.angle };

  const { C, h } = hexToOklch(hex);
  if (C < MIN_HUE_CHROMA) return undefined;
  if (snap === 'exact') return { model: borealis, angle: h };

  const { model, angle } = entries.reduce((best, entry) =>
    hueDistance(entry.angle, h) < hueDistance(best.angle, h) ? entry : best
  );
  return { model, angle };
};

/** A color's position along the ramp, 0 to 1: its APCA Lc against the mode's surface, between `ramp.from` and `ramp.to`. */
export const rampPosition = (color: string, mode: Mode): number => {
  const hex = toHex(color);
  if (!hex) return 0;
  const { ramp } = DEFAULT_PARAMS;
  return clamp01((Math.abs(apcaLc(hex, SURFACES[mode])) - ramp.from) / (ramp.to - ramp.from));
};
