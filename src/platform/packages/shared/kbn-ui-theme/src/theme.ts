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
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { getComputed } from '@elastic/eui';

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

const useCssVars =
  (typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    process.env.EUI_CSS_VARS === 'true') ||
  (typeof localStorage !== 'undefined' && localStorage.getItem('EUI_CSS_VARS') === 'true');

const cssVarProxyCache = new Map<string, unknown>();

const createCssVarProxy = (target: Record<string, unknown>, prefix: string): unknown => {
  if (cssVarProxyCache.has(prefix)) {
    return cssVarProxyCache.get(prefix);
  }
  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      if (typeof key === 'symbol') {
        return Reflect.get(obj, key, receiver);
      }
      const value = Reflect.get(obj, key, receiver);
      const varName = prefix ? `${prefix}-${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return createCssVarProxy(value as Record<string, unknown>, varName);
      }
      if (typeof value === 'string') {
        return `var(--eui-${varName})`;
      }
      return value;
    },
  });
  cssVarProxyCache.set(prefix, proxy);
  return proxy;
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
 * EUI Theme vars that automatically adjust to light/dark theme.
 * When EUI_CSS_VARS=true, returns CSS custom property references instead of literal values.
 */
export const euiThemeVars: Theme = new Proxy(
  isDarkMode ? getThemeVars().dark : getThemeVars().light,
  {
    get(accessedTarget, accessedKey, ...rest) {
      if (useCssVars && typeof accessedKey === 'string') {
        const value = Reflect.get(getThemeVars().light, accessedKey, ...rest);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return createCssVarProxy(value as Record<string, unknown>, accessedKey);
        }
        if (typeof value === 'string') {
          return `var(--eui-${accessedKey})`;
        }
        return value;
      }
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

// --- CSS Variables generation ---

const flattenTokens = (
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string | number> => {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}-${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenTokens(value as Record<string, unknown>, p));
    } else if (typeof value === 'string' || typeof value === 'number') {
      result[p] = value;
    }
  }
  return result;
};

const varBlock = (tokens: Record<string, string | number>, prefix: string): string =>
  Object.entries(tokens)
    .filter(([, v]) => typeof v === 'string')
    .map(([key, value]) => `  --${prefix}-${key}: ${value};`)
    .join('\n');

const diffBlock = (
  light: Record<string, string | number>,
  dark: Record<string, string | number>,
  prefix: string
): string =>
  Object.entries(dark)
    .filter(([key, value]) => typeof value === 'string' && value !== light[key])
    .map(([key, value]) => `  --${prefix}-${key}: ${value};`)
    .join('\n');

let cachedCss: string | undefined;

/**
 * Generates a CSS stylesheet string with custom properties for both light and dark themes.
 * Covers both euiThemeVars flat tokens (--eui-*) and computed useEuiTheme() tokens (--euiTheme-*).
 */
export const generateCssVarsStylesheet = (): string => {
  if (cachedCss) {
    return cachedCss;
  }

  const flatLight = flattenTokens(borealisLight as Record<string, unknown>);
  const flatDark = flattenTokens(borealisDark as Record<string, unknown>);
  const computedLight = flattenTokens(
    getComputed(EuiThemeBorealis, {}, 'LIGHT', false) as unknown as Record<string, unknown>
  );
  const computedDark = flattenTokens(
    getComputed(EuiThemeBorealis, {}, 'DARK', false) as unknown as Record<string, unknown>
  );

  cachedCss = [
    ':root, [data-theme="light"] {',
    varBlock(flatLight, 'eui'),
    varBlock(computedLight, 'euiTheme'),
    '}',
    '[data-theme="dark"] {',
    diffBlock(flatLight, flatDark, 'eui'),
    diffBlock(computedLight, computedDark, 'euiTheme'),
    '}',
  ].join('\n');

  return cachedCss;
};
