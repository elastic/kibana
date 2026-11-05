/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';

// Mirrors EUI's `isColorDark` (WCAG relative luminance <= 0.179), inlined to avoid
// loading `@elastic/eui` from server-side code paths.
const isColorDark = (red: number, green: number, blue: number): boolean => {
  const [r, g, b] = [red, green, blue]
    .map((c) => c / 255.0)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance <= 0.179;
};

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

export function getValidColor(color?: string | null): chroma.Color | undefined;
export function getValidColor(
  color?: string | null,
  options?: { shouldBeCompatibleWithColorJs: true }
): chroma.Color;
export function getValidColor(
  color?: string | null,
  { shouldBeCompatibleWithColorJs }: { shouldBeCompatibleWithColorJs?: boolean } = {
    shouldBeCompatibleWithColorJs: false,
  }
) {
  const isValid = chroma.valid(color);
  if (isValid) {
    return chroma(color!);
  }
  // The fallback follows the preexisting fallback used from the `color` library
  // https://github.com/Qix-/color/blob/e188999dee229c902102ec37e398ff4d868616e5/index.js#L38-L41
  if (shouldBeCompatibleWithColorJs) {
    return chroma('#000000');
  }
  return undefined;
}
