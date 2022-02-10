/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ThemeServiceSetup, ThemeServiceStart, CoreTheme } from './types';
import type { ThemeService } from './theme_service';

const mockTheme: CoreTheme = {
  darkMode: false,
};

const createThemeMock = (): CoreTheme => {
  return { ...mockTheme };
};

const createTheme$Mock = () => {
  return of(createThemeMock());
};

const createThemeSetupMock = () => {
  const setupMock: jest.Mocked<ThemeServiceSetup> = {
    theme$: createTheme$Mock(),
  };
  return setupMock;
};

const createThemeStartMock = () => {
  const startMock: jest.Mocked<ThemeServiceStart> = {
    theme$: createTheme$Mock(),
  };
  return startMock;
};

type ThemeServiceContract = PublicMethodsOf<ThemeService>;

const createServiceMock = () => {
  const mocked: jest.Mocked<ThemeServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createThemeSetupMock());
  mocked.start.mockReturnValue(createThemeStartMock());

  return mocked;
};

export const themeServiceMock = {
  create: createServiceMock,
  createSetupContract: createThemeSetupMock,
  createStartContract: createThemeStartMock,
  createTheme: createThemeMock,
  createTheme$: createTheme$Mock,
};
