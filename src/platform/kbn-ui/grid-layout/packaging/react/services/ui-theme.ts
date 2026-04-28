/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Stub for @kbn/ui-theme — no-op implementation for standalone bundle.
//
// The grid-layout uses `euiThemeVars.euiSizeS` to derive the keyboard drag
// bottom limit (parseInt(euiThemeVars.euiSizeS, 10) → 8). The consumer app
// will have EUI installed, so actual CSS custom properties are available in
// the DOM; this stub only needs to supply the JS-side constant.

export type Theme = 'light' | 'dark';

export const darkMode = false;
export const tag = '';
export const version = '';

/** Subset of EUI theme size tokens used by grid-layout. */
export const euiThemeVars = {
  euiSizeS: '8px',
  euiSizeM: '16px',
  euiSizeL: '24px',
  euiSizeXL: '32px',
  euiSizeXXL: '40px',
};

export const euiDarkVars = {};
export const euiLightVars = {};
export const getEuiThemeVars = () => euiThemeVars;
export const _setDarkMode = (_dark: boolean): void => undefined;
