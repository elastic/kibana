/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const systemThemeIsDarkMock = vi.fn();
export const onSystemThemeChangeMock = vi.fn();
export const browsersSupportsSystemThemeMock = vi.fn();

vi.doMock('./system_theme', async () => {
  const actual = (await vi.importActual('./utils'));
  return {
    ...actual,
    systemThemeIsDark: systemThemeIsDarkMock,
    onSystemThemeChange: onSystemThemeChangeMock,
    browsersSupportsSystemTheme: browsersSupportsSystemThemeMock,
  };
});

export const createStyleSheetMock = vi.fn();

vi.doMock('./utils', async () => {
  const actual = (await vi.importActual('./utils'));
  return {
    ...actual,
    createStyleSheet: createStyleSheetMock,
  };
});

export const setDarkModeMock = vi.fn();

vi.doMock('@kbn/ui-theme', async () => {
  const actual = (await vi.importActual('@kbn/ui-theme'));
  return {
    ...actual,
    _setDarkMode: setDarkModeMock,
  };
});
