/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getValidColor } from '@kbn/coloring';
import chroma from 'chroma-js';

const MAX_LIGHTNESS = 0.93;
const MAX_LIGHTNESS_SPACE = 0.2;

export function lightenColor(baseColor: string, step: number, totalSteps: number) {
  if (totalSteps === 1) {
    return baseColor;
  }

  const [h, s, l] = getValidColor(baseColor, { shouldBeCompatibleWithColorJs: true }).hsl();
  const lightnessSpace = Math.min(MAX_LIGHTNESS - l, MAX_LIGHTNESS_SPACE);
  const currentLevelTargetLightness = l + lightnessSpace * ((step - 1) / (totalSteps - 1));
  return chroma.hsl(h, s, currentLevelTargetLightness).hex();
}
