/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getConfigurationMock = jest.fn();
export const shouldInstrumentClientMock = jest.fn(() => true);
jest.doMock('@kbn/apm-config-loader', () => ({
  getConfiguration: getConfigurationMock,
  shouldInstrumentClient: shouldInstrumentClientMock,
}));

export const agentMock = {} as Record<string, any>;
jest.doMock('elastic-apm-node', () => agentMock);
