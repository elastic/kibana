/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeServiceStart } from '@kbn/core-theme-browser';

/** @internal */
export interface InternalThemeServiceStart extends ThemeServiceStart {
  /**
   * Dev-only: switch the color theme (dark/light) live, without a page reload.
   *
   * Applies the theme immediately (stylesheets, EUI providers subscribed to
   * `theme$`) and is session-only — a reload restores the server-resolved theme.
   * Not exposed on the public contract; intended for the developer toolbar.
   */
  setDarkMode(darkMode: boolean): void;
}
