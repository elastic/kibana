/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The subset of the user settings that drives the chrome background. */
export interface ChromeColorSettings {
  chromeColor?: string;
  chromeColorLight?: string;
  chromeColorDark?: string;
}

/**
 * The EUI color mode the chrome contents (text, icons) should render in so they stay readable on
 * the chrome background. `light` means a light background with dark text.
 */
export type ChromeColorMode = 'light' | 'dark';

/**
 * Elastic brand colors offered as presets.
 * TODO: confirm the exact values with design.
 */
export const CHROME_COLOR_PRESETS: string[] = [
  '#0B64DD', // Elastic Blue
  '#48EFCF', // Elastic Teal
  '#F04E98', // Elastic Pink
  '#FEC514', // Elastic Yellow
  '#101C3F', // Elastic Ink
];

/** Borealis dark page background; dark mode shades are mixed towards it. */
const DARK_BASE = '#07101F';
const WHITE = '#FFFFFF';
/** Share of the mix-in color in the derived shades. */
const LIGHT_TINT_AMOUNT = 0.85;
const DARK_SHADE_AMOUNT = 0.8;

/** Approximate default EUI text colors, used to decide which color mode reads best. */
const TEXT_ON_LIGHT = '#101C3F';
const TEXT_ON_DARK = '#CAD3E2';

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const isValidHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_REGEX.test(value);

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  let digits = hex.slice(1);
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
};

const rgbToHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`.toUpperCase();

/** Returns `base` mixed with `target`, where `amount` is the share of `target`. */
const mix = (base: string, target: string, amount: number): string => {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]);
};

const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Derives a soft light tint and a dark shade from a single base color. */
export const deriveChromeColors = (base: string): { light: string; dark: string } => ({
  light: mix(base, WHITE, LIGHT_TINT_AMOUNT),
  dark: mix(base, DARK_BASE, DARK_SHADE_AMOUNT),
});

/**
 * Resolves the chrome background for the active color mode: an explicit per-mode override wins,
 * otherwise the shade derived from the base color. Returns `undefined` to keep the default.
 */
export const resolveChromeColor = (
  settings: ChromeColorSettings | undefined,
  isDarkMode: boolean
): string | undefined => {
  if (!settings) return undefined;
  const override = isDarkMode ? settings.chromeColorDark : settings.chromeColorLight;
  if (isValidHexColor(override)) return override;
  if (isValidHexColor(settings.chromeColor)) {
    const derived = deriveChromeColors(settings.chromeColor);
    return isDarkMode ? derived.dark : derived.light;
  }
  return undefined;
};

/** Picks the color mode whose default text color has the better contrast on `background`. */
export const getChromeColorMode = (background: string): ChromeColorMode =>
  contrastRatio(background, TEXT_ON_LIGHT) >= contrastRatio(background, TEXT_ON_DARK)
    ? 'light'
    : 'dark';
