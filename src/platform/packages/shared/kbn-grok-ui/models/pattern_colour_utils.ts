/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';

export const EUI_COLOR_PALETTE_VALUES = [
  'Primary',
  'Accent',
  'AccentSecondary',
  'Neutral',
  'Success',
  'Warning',
  'Risk',
  'Danger',
] as const;

export type PatternColourPalette = (typeof EUI_COLOR_PALETTE_VALUES)[number];

export const colourToClassName = (colour: string, classPrefix = 'pattern-match') =>
  `${classPrefix}-${colour}`;

export const getColourPaletteStyles = (
  euiTheme: EuiThemeComputed,
  classPrefix = 'pattern-match'
): Record<string, { backgroundColor: string; color: string; cursor: string }> => {
  const styles: Record<string, { backgroundColor: string; color: string; cursor: string }> = {};
  for (let i = 0; i < EUI_COLOR_PALETTE_VALUES.length; i++) {
    const colour = EUI_COLOR_PALETTE_VALUES[i];
    styles[`.${classPrefix}-${colour}`] = {
      backgroundColor: euiTheme.colors[
        `backgroundLight${colour}` as keyof EuiThemeComputed['colors']
      ] as string,
      color: euiTheme.colors[`text${colour}` as keyof EuiThemeComputed['colors']] as string,
      cursor: 'pointer',
    };
  }
  return styles;
};
