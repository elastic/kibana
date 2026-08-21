/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Detect the page color mode from the Kibana theme tag on window.
 * The design tools toolbar is always rendered in dark mode via its own
 * `EuiThemeProvider`, so `useEuiTheme().colorMode` cannot be trusted
 * for page-level color matching.
 */
export const getPageColorMode = (): 'light' | 'dark' => {
  const tag = (window as unknown as { __kbnThemeTag__?: string }).__kbnThemeTag__;
  return tag?.endsWith('dark') ? 'dark' : 'light';
};

/**
 * Snapshot the current page color scheme: light/dark mode and
 * whether the OS-level forced-colors (high contrast) mode is active.
 */
export interface PageColorScheme {
  readonly colorMode: 'light' | 'dark';
  readonly forcedColors: boolean;
}

/**
 * Snapshots the current page color scheme (light/dark and forced-colors).
 *
 * @returns The current {@link PageColorScheme}.
 */
export const getPageColorScheme = (): PageColorScheme => ({
  colorMode: getPageColorMode(),
  forcedColors:
    typeof window !== 'undefined' && window.matchMedia('(forced-colors: active)').matches,
});
