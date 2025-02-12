/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ThemeServiceSetup, CoreTheme } from '@kbn/core-theme-browser';
import type { ThemeService } from '@kbn/core-theme-browser-internal';

const mockTheme: CoreTheme = {
  darkMode: false,
  name: 'borealis',
};

const createThemeMock = (): CoreTheme => {
  return { ...mockTheme };
};

const createTheme$Mock = (theme: CoreTheme = createThemeMock()) => {
  return of(theme);
};

const createThemeContractMock = (theme: CoreTheme = createThemeMock()) => {
  const themeMock: jest.Mocked<ThemeServiceSetup> = {
    theme$: createTheme$Mock(theme),
    getTheme: jest.fn().mockReturnValue(theme),
  };
  return themeMock;
};

type ThemeServiceContract = PublicMethodsOf<ThemeService>;

const createServiceMock = () => {
  const mocked: jest.Mocked<ThemeServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createThemeContractMock());
  mocked.start.mockReturnValue(createThemeContractMock());

  return mocked;
};

export const themeServiceMock = {
  create: createServiceMock,
  createSetupContract: createThemeContractMock,
  createStartContract: createThemeContractMock,
  createTheme: createThemeMock,
  createTheme$: createTheme$Mock,
};
