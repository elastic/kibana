/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { ThemeService } from './theme';

export const themeServiceMock: ThemeService = {
  chartsDefaultTheme: EUI_CHARTS_THEME_LIGHT.theme,
  chartsTheme$: jest.fn(() => ({
    subscribe: jest.fn(),
  })),
  chartsBaseTheme$: jest.fn(() => ({
    subscribe: jest.fn(),
  })),
  darkModeEnabled$: jest.fn(() => ({
    subscribe: jest.fn(),
  })),
  useDarkMode: jest.fn().mockReturnValue(false),
  useChartsTheme: jest.fn().mockReturnValue({}),
  useChartsBaseTheme: jest.fn().mockReturnValue({}),
} as any;
