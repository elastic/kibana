/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { sslSchema, getServerOptions } from '@kbn/server-http-tools';

export const hapiStartMock = vi.fn();
export const hapiStopMock = vi.fn();
export const hapiRouteMock = vi.fn();
export const createServerMock = vi.fn().mockImplementation(() => ({
  info: { uri: 'http://localhost:3000' },
  start: hapiStartMock,
  stop: hapiStopMock,
  route: hapiRouteMock,
}));
export const getServerOptionsMock = vi.fn().mockImplementation(getServerOptions);

vi.doMock('@kbn/server-http-tools', () => {
  const mocked = {
    createServer: createServerMock,
    getServerOptions: getServerOptionsMock,
    sslSchema,
    SslConfig: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
