/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LIGHT_THEME } from '@elastic/charts';
import { ThemeService } from './theme';

export const themeServiceMock: ThemeService = {
  chartsDefaultBaseTheme: LIGHT_THEME,
  chartsBaseTheme$: jest.fn(() => ({
    subscribe: jest.fn(),
  })),
  darkModeEnabled$: jest.fn(() => ({
    subscribe: jest.fn(),
  })),
  useDarkMode: jest.fn().mockReturnValue(false),
  useChartsBaseTheme: jest.fn().mockReturnValue(LIGHT_THEME),
} as any;
