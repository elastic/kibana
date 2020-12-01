/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
