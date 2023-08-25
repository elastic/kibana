/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chroma from 'chroma-js';
import { APCAContrast } from './apca';

export function getValidColor(color: string): chroma.Color {
  try {
    return chroma(color);
  } catch {
    return chroma('red');
  }
}

export function getColorContrast(color: string, isDark: boolean) {
  const [r, g, b] = getValidColor(color).rgb();
  // TODO: change background depending on theme
  const value = APCAContrast(isDark ? [0, 0, 0] : [255, 255, 255], [r, g, b]);
  return { value: value.toFixed(1), contrast: Math.abs(value) > 40 };
}

export function changeAlpha(color: string, alpha: number) {
  const [r, g, b] = getValidColor(color).rgb();
  return `rgba(${r},${g},${b}, ${alpha})`;
}

export function toHex(color: string) {
  return getValidColor(color).hex();
}

export function isSameColor(color1: string, color2: string) {
  return toHex(color1) === toHex(color2);
}
