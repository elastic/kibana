/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Color from 'color';

export const computeGradientFinalColor = (color: string, size: number): string => {
  const inputColor = new Color(color);
  let workingColor = Color.hsl(inputColor.hsl().object());
  const rotateBy = inputColor.luminosity() / (size - 1);
  const hsl = workingColor.hsl().object();
  hsl.l -= rotateBy * 100 * (size - 1);
  workingColor = Color.hsl(hsl);
  return workingColor.rgb().toString();
};
