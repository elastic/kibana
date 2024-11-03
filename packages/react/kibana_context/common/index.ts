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

import type { KibanaTheme } from './types';

/**
 * The default `KibanaTheme` for use in Storybook, Jest, or initialization.  At
 * runtime, the theme should always be provided by the `ThemeService`.
 */
export const defaultTheme: KibanaTheme = {
  darkMode: false,
};
