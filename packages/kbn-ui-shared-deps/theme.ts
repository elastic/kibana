/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import LightTheme from '@elastic/eui/dist/eui_theme_light.json';

const globals: any = typeof window === 'undefined' ? {} : window;

export type Theme = typeof LightTheme;

// in the Kibana app we can rely on this global being defined, but in
// some cases (like jest) the global is undefined
export const tag: string = globals.__kbnThemeTag__ || 'v7light';
export const version = tag.startsWith('v7') ? 7 : 8;
export const darkMode = tag.endsWith('dark');

export let euiLightVars: Theme;
export let euiDarkVars: Theme;
if (version === 7) {
  euiLightVars = require('@elastic/eui/dist/eui_theme_light.json');
  euiDarkVars = require('@elastic/eui/dist/eui_theme_dark.json');
} else {
  euiLightVars = require('@elastic/eui/dist/eui_theme_amsterdam_light.json');
  euiDarkVars = require('@elastic/eui/dist/eui_theme_amsterdam_dark.json');
}

/**
 * EUI Theme vars that automatically adjust to light/dark theme
 */
export let euiThemeVars: Theme;
if (darkMode) {
  euiThemeVars = euiDarkVars;
} else {
  euiThemeVars = euiLightVars;
}
