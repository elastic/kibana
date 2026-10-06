/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeName } from '@kbn/core-ui-settings-common';
export declare const getThemeTag: ({
  name,
  darkMode,
}: {
  name: string;
  darkMode: boolean;
}) => string;
/**
 * Check whether the theme is bundled in the current kibana build.
 * For a theme to be considered bundled both light and dark mode
 * styles must be included.
 */
export declare const isThemeBundled: (name: ThemeName) => boolean;
