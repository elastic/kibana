/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const bootstrapRendererMock = jest.fn();
export const registerBootstrapRouteMock = jest.fn();
export const bootstrapRendererFactoryMock = jest.fn(() => bootstrapRendererMock);

jest.doMock('./bootstrap', () => ({
  registerBootstrapRoute: registerBootstrapRouteMock,
  bootstrapRendererFactory: bootstrapRendererFactoryMock,
}));

export const getSettingValueMock = jest.fn();
export const getCommonStylesheetPathsMock = jest.fn();
export const getThemeStylesheetPathsMock = jest.fn();
export const getScriptPathsMock = jest.fn();
export const getBrowserLoggingConfigMock = jest.fn();

jest.doMock('./render_utils', () => ({
  getSettingValue: getSettingValueMock,
  getCommonStylesheetPaths: getCommonStylesheetPathsMock,
  getThemeStylesheetPaths: getThemeStylesheetPathsMock,
  getScriptPaths: getScriptPathsMock,
  getBrowserLoggingConfig: getBrowserLoggingConfigMock,
}));

export const getApmConfigMock = jest.fn();
jest.doMock('./get_apm_config', () => {
  return {
    getApmConfig: getApmConfigMock,
  };
});
