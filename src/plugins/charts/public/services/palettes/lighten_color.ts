/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import color from 'color';

const MAX_LIGHTNESS = 93;
const MAX_LIGHTNESS_SPACE = 20;

export function lightenColor(baseColor: string, step: number, totalSteps: number) {
  if (totalSteps === 1) {
    return baseColor;
  }

  const hslColor = color(baseColor, 'hsl');
  const outputColorLightness = hslColor.lightness();
  const lightnessSpace = Math.min(MAX_LIGHTNESS - outputColorLightness, MAX_LIGHTNESS_SPACE);
  const currentLevelTargetLightness =
    outputColorLightness + lightnessSpace * ((step - 1) / (totalSteps - 1));
  const lightenedColor = hslColor.lightness(currentLevelTargetLightness);
  return lightenedColor.hex();
}
