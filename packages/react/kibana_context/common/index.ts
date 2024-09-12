/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getColorMode } from './color_mode';
export type { KibanaTheme, ThemeServiceStart } from './types';
export { getKibanaThemeByName, getKibanaDefaultTheme } from './theme';

import type { KibanaTheme } from './types';
import { DEFAULT_KIBANA_THEME_NAME } from './theme';

/**
 * The default `KibanaTheme` for use in Storybook, Jest, or initialization.  At
 * runtime, the theme should always be provided by the `ThemeService`.
 */
export const defaultTheme: KibanaTheme = {
  darkMode: false,
  name: DEFAULT_KIBANA_THEME_NAME,
};
