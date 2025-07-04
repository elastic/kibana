/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LIGHT_THEME, PartialTheme } from '@elastic/charts';
import { ThemeService } from './theme';

export const MOCK_SPARKLINE_THEME: PartialTheme = {
  lineSeriesStyle: {
    point: {
      visible: 'never',
      strokeWidth: 1,
      radius: 1,
    },
  },
  areaSeriesStyle: {
    point: {
      visible: 'never',
      strokeWidth: 1,
      radius: 1,
    },
  },
};

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
  useSparklineOverrides: jest.fn().mockReturnValue(MOCK_SPARKLINE_THEME),
} as any;
