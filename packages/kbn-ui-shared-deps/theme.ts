/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import LightTheme from '@elastic/eui/dist/eui_theme_light.json';

const globals: any = typeof window === 'undefined' ? {} : window;

export type Theme = typeof LightTheme;

// in the Kibana app we can rely on this global being defined, but in
// some cases (like jest, or karma tests) the global is undefined
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
