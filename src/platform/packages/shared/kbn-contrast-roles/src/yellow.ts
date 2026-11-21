/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HueRules } from './types';

// Yellow is hard: it peaks in chroma when very light and turns brown or olive as it darkens. It's the only hue with
// its own rules.

// Oranges through yellows (OKLCH hue)
export const isYellow = (angle: number) => angle >= 55 && angle <= 105;

const DARK_TURN = 15;
const TURN_FADE = 0.1;
const DARK_BASE_CHROMA = 0.8;
const DARK_FAINT_CHROMA = 0.05;

const onDark = (surfaceL: number) => surfaceL < 0.5;

export const yellowRules = (angle: number): HueRules => ({
  // Below base, turn up to DARK_TURN° toward orange over TURN_FADE of L, so it doesn't go olive.
  hueAt: (L, baseL) =>
    L >= baseL ? angle : angle - DARK_TURN * Math.min(1, (baseL - L) / TURN_FADE),
  // On dark, base is a little less colorful; the other roles follow, as their chroma caps on base's.
  baseChroma: (surfaceL) => (onDark(surfaceL) ? DARK_BASE_CHROMA : 1),
  // On dark, faint at full chroma is brown; capped, it's a warm taupe.
  faintChroma: (surfaceL) => (onDark(surfaceL) ? DARK_FAINT_CHROMA : null),
  // Muted is light's on both surfaces, so it never needs a darker yellow.
  sharedMuted: true,
  // Stacks keep muted: on light, strong is the darker yellow sharedMuted avoids.
  pair: () => 'muted',
});
