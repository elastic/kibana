/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isColorDark } from '@elastic/eui';

export const parseRgbString = (rgb: string) => {
  const groups = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*?(,\s*(\d+)\s*)?\)/) ?? [];
  if (!groups) {
    return null;
  }

  const red = parseFloat(groups[1]);
  const green = parseFloat(groups[2]);
  const blue = parseFloat(groups[3]);
  const opacity = groups[5] ? parseFloat(groups[5]) : undefined;

  return { red, green, blue, opacity };
};

export const shouldApplyColor = (color: string) => {
  const rgb = parseRgbString(color);
  const { opacity } = rgb ?? {};

  // if opacity === 0, it means there is no color to apply to the metric
  return !rgb || (rgb && opacity !== 0);
};

export const needsLightText = (bgColor: string = '') => {
  const rgb = parseRgbString(bgColor);
  if (!rgb) {
    return false;
  }

  const { red, green, blue, opacity } = rgb;
  return isColorDark(red, green, blue) && opacity !== 0;
};
