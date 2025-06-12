/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseThemeTags, ThemeName, ThemeTag } from '@kbn/core-ui-settings-common';

export const getThemeTag = ({ name, darkMode }: { name: string; darkMode: boolean }) => {
  // Amsterdam theme is called `v8` internally
  // and should be kept this way for compatibility reasons.
  if (name === 'amsterdam') {
    name = 'v8';
  }

  return `${name}${darkMode ? 'dark' : 'light'}`;
};

/**
 * Check whether the theme is bundled in the current kibana build.
 * For a theme to be considered bundled both light and dark mode
 * styles must be included.
 */
export const isThemeBundled = (name: ThemeName): boolean => {
  const bundledThemeTags = parseThemeTags(process.env.KBN_OPTIMIZER_THEMES);

  return (
    bundledThemeTags.includes(getThemeTag({ name, darkMode: false }) as ThemeTag) &&
    bundledThemeTags.includes(getThemeTag({ name, darkMode: true }) as ThemeTag)
  );
};
