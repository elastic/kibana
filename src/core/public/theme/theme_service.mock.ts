/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { ThemeServiceSetup, ThemeServiceStart, CoreTheme } from './types';

const mockTheme: CoreTheme = {
  darkMode: false,
};

const createThemeSetupMock = () => {
  const setupMock: jest.Mocked<ThemeServiceSetup> = {
    theme$: of(mockTheme),
  };
  return setupMock;
};

const createThemeStartMock = () => {
  const startMock: jest.Mocked<ThemeServiceStart> = {
    theme$: of(mockTheme),
  };
  return startMock;
};

export const themeServiceMock = {
  createSetupContract: createThemeSetupMock,
  createStartContract: createThemeStartMock,
};
