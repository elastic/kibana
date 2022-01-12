/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RequiredPaletteParamTypes } from '../common';
export const FIXED_PROGRESSION = 'fixed' as const;
export const CUSTOM_PALETTE = 'custom';
export const DEFAULT_CONTINUITY = 'above';

export const DEFAULT_PALETTE_NAME = 'gray';
export const DEFAULT_COLOR_STEPS = 3;
export const DEFAULT_MIN_STOP = 0;
export const DEFAULT_MAX_STOP = 100;

export const defaultPaletteParams: RequiredPaletteParamTypes & { maxSteps: number } = {
  name: DEFAULT_PALETTE_NAME,
  colorStops: [],
  continuity: DEFAULT_CONTINUITY,
  reverse: false,
  rangeType: 'percent',
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  progression: FIXED_PROGRESSION,
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  maxSteps: 5,
};
