/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrinkType, DrinkSize } from '../../common';

interface DrinkRecipe {
  /** Base milliseconds for each stage of preparing this drink (before the size multiplier). */
  readonly grindMs: number;
  readonly brewMs: number;
  readonly garnishMs: number;
  /** Espresso shots before the size multiplier. */
  readonly baseShots: number;
}

/**
 * The menu. Each drink has its own per-stage timing so the duration histogram and the
 * traces look different per drink — that is what makes the workshop data interesting.
 */
export const MENU: Record<DrinkType, DrinkRecipe> = {
  espresso: { grindMs: 60, brewMs: 120, garnishMs: 20, baseShots: 1 },
  latte: { grindMs: 70, brewMs: 180, garnishMs: 90, baseShots: 1 },
  cappuccino: { grindMs: 70, brewMs: 160, garnishMs: 110, baseShots: 1 },
  cold_brew: { grindMs: 90, brewMs: 240, garnishMs: 30, baseShots: 2 },
};

/** Bigger cups take proportionally longer to make and use more shots. */
export const SIZE_MULTIPLIER: Record<DrinkSize, number> = {
  small: 1,
  medium: 1.4,
  large: 1.8,
};
