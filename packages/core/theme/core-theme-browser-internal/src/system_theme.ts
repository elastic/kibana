/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const systemThemeIsDark = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const onSystemThemeChange = (handler: (darkMode: boolean) => void) => {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    handler(e.matches);
  });
};

export const browsersSupportsSystemTheme = (): boolean => {
  try {
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    return matchMedia.matches !== undefined && matchMedia.addEventListener !== undefined;
  } catch (e) {
    return false;
  }
};
