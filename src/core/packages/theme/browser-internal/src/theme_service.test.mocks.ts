/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const systemThemeIsDarkMock = jest.fn();
export const onSystemThemeChangeMock = jest.fn();
export const browsersSupportsSystemThemeMock = jest.fn();

jest.doMock('./system_theme', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    systemThemeIsDark: systemThemeIsDarkMock,
    onSystemThemeChange: onSystemThemeChangeMock,
    browsersSupportsSystemTheme: browsersSupportsSystemThemeMock,
  };
});

export const createStyleSheetMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    createStyleSheet: createStyleSheetMock,
  };
});

export const setDarkModeMock = jest.fn();

jest.doMock('@kbn/ui-theme', () => {
  const actual = jest.requireActual('@kbn/ui-theme');
  return {
    ...actual,
    _setDarkMode: setDarkModeMock,
  };
});
