/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable-next-line @kbn/eslint/module_migration */
import { default as v8Light } from '@elastic/eui/dist/eui_theme_light.json';
/* eslint-disable-next-line @kbn/eslint/module_migration */
import { default as v8Dark } from '@elastic/eui/dist/eui_theme_dark.json';

const globals: any = typeof window === 'undefined' ? {} : window;

export type Theme = typeof v8Light;

// in the Kibana app we can rely on this global being defined, but in
// some cases (like jest) the global is undefined
/** @deprecated theme can be dynamic now, access is discouraged */
export const tag: string = globals.__kbnThemeTag__ || 'v8light';
/** @deprecated theme can be dynamic now, access is discouraged */
export const version = 8;
/** @deprecated theme can be dynamic now, access is discouraged */
export const darkMode = tag.endsWith('dark');

export const euiLightVars: Theme = v8Light;
export const euiDarkVars: Theme = v8Dark;

let isDarkMode = darkMode;
export const _setDarkMode = (mode: boolean) => {
  isDarkMode = mode;
};

/**
 * EUI Theme vars that automatically adjust to light/dark theme
 */
export const euiThemeVars: Theme = new Proxy(isDarkMode ? euiDarkVars : euiLightVars, {
  get(accessedTarget, accessedKey, ...rest) {
    return Reflect.get(isDarkMode ? euiDarkVars : euiLightVars, accessedKey, ...rest);
  },
});
