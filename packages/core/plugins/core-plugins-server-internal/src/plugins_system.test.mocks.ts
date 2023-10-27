/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRuntimePluginContractResolverMock } from './test_helpers';

export const mockCreatePluginPrebootSetupContext = jest.fn();
export const mockCreatePluginSetupContext = jest.fn();
export const mockCreatePluginStartContext = jest.fn();

jest.mock('./plugin_context', () => ({
  createPluginPrebootSetupContext: mockCreatePluginPrebootSetupContext,
  createPluginSetupContext: mockCreatePluginSetupContext,
  createPluginStartContext: mockCreatePluginStartContext,
}));

export const runtimeResolverMock = createRuntimePluginContractResolverMock();

jest.doMock('./plugin_contract_resolver', () => {
  return {
    RuntimePluginContractResolver: jest.fn().mockImplementation(() => runtimeResolverMock),
  };
});
