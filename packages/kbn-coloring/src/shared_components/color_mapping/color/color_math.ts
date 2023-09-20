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
  return `rgba(${r},${g},${b},${alpha})`;
}

export function toHex(color: string) {
  return getValidColor(color).hex().toLowerCase();
}

export function isSameColor(color1: string, color2: string) {
  return toHex(color1) === toHex(color2);
}

/**
 * Blend a foreground (fg) color with a background (bg) color
 */
export function combineColors(fg: string, bg: string): string {
  const [fgR, fgG, fgB, fgA] = getValidColor(fg).rgba();
  const [bgR, bgG, bgB, bgA] = getValidColor(bg).rgba();

  // combine colors only if foreground has transparency
  if (fgA === 1) {
    return chroma.rgb(fgR, fgG, fgB).hex();
  }

  // For reference on alpha calculations:
  // https://en.wikipedia.org/wiki/Alpha_compositing
  const alpha = fgA + bgA * (1 - fgA);

  if (alpha === 0) {
    return '#00000000';
  }

  const r = Math.round((fgR * fgA + bgR * bgA * (1 - fgA)) / alpha);
  const g = Math.round((fgG * fgA + bgG * bgA * (1 - fgA)) / alpha);
  const b = Math.round((fgB * fgA + bgB * bgA * (1 - fgA)) / alpha);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
