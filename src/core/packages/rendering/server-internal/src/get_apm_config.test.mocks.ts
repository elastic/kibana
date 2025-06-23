/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createMockedTracingApi } from '@kbn/tracing-test-utils';

export const getConfigurationMock = jest.fn();
export const shouldInstrumentClientMock = jest.fn(() => true);
jest.doMock('@kbn/apm-config-loader', () => ({
  getConfiguration: getConfigurationMock,
  shouldInstrumentClient: shouldInstrumentClientMock,
}));

const tracingApiMock = createMockedTracingApi();
export const agentMock = tracingApiMock.legacy;

jest.doMock('@kbn/tracing', () => {
  return {
    tracingApi: agentMock,
  };
});
