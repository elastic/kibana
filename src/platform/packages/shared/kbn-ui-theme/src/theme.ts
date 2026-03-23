/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { default as borealisLight } from '@elastic/eui-theme-borealis/lib/eui_theme_borealis_light.json';
import { default as borealisDark } from '@elastic/eui-theme-borealis/lib/eui_theme_borealis_dark.json';

const globals: any = typeof window === 'undefined' ? {} : window;

/**
 * The shape of EUI theme variables, derived from the Borealis light theme token set.
 */
export type Theme = typeof borealisLight;

// in the Kibana app we can rely on this global being defined, but in
// some cases (like jest) the global is undefined

/**
 * The raw theme tag string read from `window.__kbnThemeTag__` at page load.
 *
 * @deprecated Theme can be dynamic now; direct access is discouraged.
 */
export const tag: string = globals.__kbnThemeTag__ || 'borealislight';

/**
 * The Kibana UI theme major version number.
 *
 * @deprecated Theme can be dynamic now; direct access is discouraged.
 */
export const version = 8;

/**
 * Whether the dark theme was active at page load, derived from {@link tag}.
 *
 * @deprecated Theme can be dynamic now; direct access is discouraged. Use
 *   {@link euiThemeVars} for values that respond to runtime theme changes.
 */
export const darkMode = tag.endsWith('dark');

let isDarkMode = darkMode;

/**
 * Sets the dark mode state used internally by {@link euiThemeVars}.
 * This is an internal API used by the Kibana theme service; do not call directly.
 *
 * @param mode - When `true`, {@link euiThemeVars} will return dark theme variables.
 */
export const _setDarkMode = (mode: boolean) => {
  isDarkMode = mode;
};

const getThemeVars = (): { light: Theme; dark: Theme } => {
  return {
    light: borealisLight,
    dark: borealisDark,
  };
};

/** Static snapshot of EUI light theme variables. Prefer {@link euiThemeVars} for values that respond to runtime theme changes. */
export const euiLightVars: Theme = getThemeVars().light;
/** Static snapshot of EUI dark theme variables. Prefer {@link euiThemeVars} for values that respond to runtime theme changes. */
export const euiDarkVars: Theme = getThemeVars().dark;

/**
 * EUI Theme vars that automatically adjust to light/dark theme
 */
export const euiThemeVars: Theme = new Proxy(
  isDarkMode ? getThemeVars().dark : getThemeVars().light,
  {
    get(accessedTarget, accessedKey, ...rest) {
      return Reflect.get(
        isDarkMode ? getThemeVars().dark : getThemeVars().light,
        accessedKey,
        ...rest
      );
    },
  }
);

/**
 * Returns the EUI theme variable set for the given theme configuration.
 *
 * @param theme - The active theme configuration.
 * @param theme.name - The name of the theme (e.g., `'borealis'`).
 * @param theme.darkMode - When `true`, returns dark theme variables; otherwise returns light theme variables.
 * @returns The {@link Theme} variable set matching the given configuration.
 */
export function getEuiThemeVars(theme: { name: string; darkMode: boolean }) {
  return theme.darkMode ? borealisDark : borealisLight;
}
