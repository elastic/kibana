/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const BOREALIS_LIGHT = 'borealis.light';
export const BOREALIS_DARK = 'borealis.dark';
export const AMSTERDAM_LIGHT = 'amsterdam.light';
export const AMSTERDAM_DARK = 'amsterdam.dark';

export const THEMES = [BOREALIS_LIGHT, BOREALIS_DARK, AMSTERDAM_LIGHT, AMSTERDAM_DARK] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'borealis.light';

export const THEME_TITLES: Record<Theme, string> = {
  [BOREALIS_LIGHT]: 'Borealis Light',
  [BOREALIS_DARK]: 'Borealis Dark',
  [AMSTERDAM_LIGHT]: 'Amsterdam Light',
  [AMSTERDAM_DARK]: 'Amsterdam Dark',
};

export const getColorMode = (theme: Theme) => {
  if (theme === BOREALIS_DARK || theme === AMSTERDAM_DARK) {
    return 'dark';
  }

  return 'light';
};

export const getEuiThemeName = (theme: Theme) => {
  if (theme === AMSTERDAM_LIGHT || theme === AMSTERDAM_DARK) {
    return 'amsterdam';
  }
  return 'borealis';
};

export const getKibanaTheme = (theme: Theme) => {
  const colorMode = getColorMode(theme);
  const name = getEuiThemeName(theme);

  return {
    darkMode: colorMode === 'dark',
    name,
  };
};
