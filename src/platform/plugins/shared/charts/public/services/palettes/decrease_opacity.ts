/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { euiThemeVars } from '@kbn/ui-theme';

const MIN_OPACITY = 0.2;

/**
 * Reduces color opacity, by mixing color with background color.
 *
 * This is used when the resulting color needs to be opaque (i.e. alpha of 1).
 */
export function decreaseOpacity(baseColor: string, step: number, totalSteps: number) {
  if (totalSteps === 1) {
    return baseColor;
  }

  const backgroundColor = euiThemeVars.euiColorEmptyShade;
  const ratio = Math.min(0.2 * (step - 1), 1 - MIN_OPACITY);
  const color = chroma(baseColor).mix(backgroundColor, ratio, 'lch');

  return color.hex().toUpperCase();
}
