/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sslSchema, getServerOptions, getListenerOptions } from '@kbn/server-http-tools';

export const hapiStartMock = jest.fn();
export const hapiStopMock = jest.fn();
export const hapiRouteMock = jest.fn();
export const createServerMock = jest.fn().mockImplementation(() => ({
  info: { uri: 'http://localhost:3000' },
  start: hapiStartMock,
  stop: hapiStopMock,
  route: hapiRouteMock,
}));
export const getServerOptionsMock = jest.fn().mockImplementation(getServerOptions);
export const getListenerOptionsMock = jest.fn().mockImplementation(getListenerOptions);

jest.doMock('@kbn/server-http-tools', () => ({
  createServer: createServerMock,
  getServerOptions: getServerOptionsMock,
  getListenerOptions: getListenerOptionsMock,
  sslSchema,
  SslConfig: jest.fn(),
}));
