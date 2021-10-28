/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { default as v7Light } from '@elastic/eui/dist/eui_theme_light.json';
import { default as v7Dark } from '@elastic/eui/dist/eui_theme_dark.json';
import { default as v8Light } from '@elastic/eui/dist/eui_theme_amsterdam_light.json';
import { default as v8Dark } from '@elastic/eui/dist/eui_theme_amsterdam_dark.json';

const globals: any = typeof window === 'undefined' ? {} : window;

export type Theme = typeof v7Light | typeof v8Light;

// in the Kibana app we can rely on this global being defined, but in
// some cases (like jest) the global is undefined
export const tag: string = globals.__kbnThemeTag__ || 'v7light';
export const version = tag.startsWith('v7') ? 7 : 8;
export const darkMode = tag.endsWith('dark');

export let euiLightVars: Theme;
export let euiDarkVars: Theme;
if (version === 7) {
  euiLightVars = v7Light;
  euiDarkVars = v7Dark;
} else {
  euiLightVars = v8Light;
  euiDarkVars = v8Dark;
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
