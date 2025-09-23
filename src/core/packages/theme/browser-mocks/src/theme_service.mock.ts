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
import { lazyObject } from '@kbn/lazy-object';

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
  const themeMock: jest.Mocked<ThemeServiceSetup> = lazyObject({
    theme$: createTheme$Mock(theme),
    getTheme: jest.fn().mockReturnValue(theme),
  });
  return themeMock;
};

type ThemeServiceContract = PublicMethodsOf<ThemeService>;

const createServiceMock = () => {
  const mocked: jest.Mocked<ThemeServiceContract> = lazyObject({
    setup: jest.fn().mockReturnValue(createThemeContractMock()),
    start: jest.fn().mockReturnValue(createThemeContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const themeServiceMock = {
  create: createServiceMock,
  createSetupContract: createThemeContractMock,
  createStartContract: createThemeContractMock,
  createTheme: createThemeMock,
  createTheme$: createTheme$Mock,
};
