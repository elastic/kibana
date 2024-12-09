/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { isColorDark } from '@elastic/eui';

export const enforceColorContrast = (color: string, backgroundColor: string) => {
  const finalColor =
    chroma(color).alpha() < 1 ? chroma.blend(backgroundColor, color, 'overlay') : chroma(color);
  return isColorDark(...finalColor.rgb());
};

export function isValidColor(colorString?: string) {
  // chroma can handle also hex values with alpha channel/transparency
  // chroma accepts also hex without #, so test for it
  return (
    colorString != null && colorString !== '' && /^#/.test(colorString) && chroma.valid(colorString)
  );
}

export const getColorAlpha = (color?: string | null) =>
  (color && isValidColor(color) && chroma(color)?.alpha()) || 1;

export const makeColorWithAlpha = (color: string, newAlpha: number) =>
  chroma(color).alpha(newAlpha);
