/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const bootstrapRendererMock = jest.fn();
export const registerBootstrapRouteMock = jest.fn();
export const bootstrapRendererFactoryMock = jest.fn(() => bootstrapRendererMock);

jest.doMock('./bootstrap', () => ({
  registerBootstrapRoute: registerBootstrapRouteMock,
  bootstrapRendererFactory: bootstrapRendererFactoryMock,
}));

export const getSettingValueMock = jest.fn();
export const getStylesheetPathsMock = jest.fn();

jest.doMock('./render_utils', () => ({
  getSettingValue: getSettingValueMock,
  getStylesheetPaths: getStylesheetPathsMock,
}));
