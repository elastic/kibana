/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const bootstrapRendererMock = vi.fn();
export const registerBootstrapRouteMock = vi.fn();
export const bootstrapRendererFactoryMock = vi.fn(() => bootstrapRendererMock);

vi.doMock('./bootstrap', () => {
      const mocked = {
      registerBootstrapRoute: registerBootstrapRouteMock,
      bootstrapRendererFactory: bootstrapRendererFactoryMock,
    };
      return { ...mocked, default: mocked };
    });

export const getSettingValueMock = vi.fn();
export const getCommonStylesheetPathsMock = vi.fn();
export const getThemeStylesheetPathsMock = vi.fn();
export const getBrowserLoggingConfigMock = vi.fn();

export const getBundlesHrefMock = vi.fn((baseHref: string) => `${baseHref}/bundles`);

vi.doMock('./render_utils', () => {
      const mocked = {
      getSettingValue: getSettingValueMock,
      getBundlesHref: getBundlesHrefMock,
      getCommonStylesheetPaths: getCommonStylesheetPathsMock,
      getThemeStylesheetPaths: getThemeStylesheetPathsMock,
      getBrowserLoggingConfig: getBrowserLoggingConfigMock,
    };
      return { ...mocked, default: mocked };
    });

export const getApmConfigMock = vi.fn();
vi.doMock('./get_apm_config', () => {
  return {
    getApmConfig: getApmConfigMock,
  };
});

export const getIsThemeBundledMock = vi.fn();
vi.doMock('./theme', () => {
  return {
    isThemeBundled: getIsThemeBundledMock,
  };
});
