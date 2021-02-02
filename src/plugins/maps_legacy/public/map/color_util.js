/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function getLegendColors(colorRamp, numLegendColors = 4) {
  const colors = [];
  colors[0] = getColor(colorRamp, 0);
  for (let i = 1; i < numLegendColors - 1; i++) {
    colors[i] = getColor(colorRamp, Math.floor((colorRamp.length * i) / numLegendColors));
  }
  colors[numLegendColors - 1] = getColor(colorRamp, colorRamp.length - 1);
  return colors;
}

export function getColor(colorRamp, i) {
  const color = colorRamp[i][1];
  const red = Math.floor(color[0] * 255);
  const green = Math.floor(color[1] * 255);
  const blue = Math.floor(color[2] * 255);
  return `rgb(${red},${green},${blue})`;
}
