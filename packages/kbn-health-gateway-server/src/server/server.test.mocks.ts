/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const hapiStartMock = jest.fn();
export const hapiStopMock = jest.fn();
export const hapiRouteMock = jest.fn();
jest.doMock('@hapi/hapi', () => ({
  server: jest.fn().mockImplementation(() => ({
    info: { uri: 'http://localhost:3000' },
    start: hapiStartMock,
    stop: hapiStopMock,
    route: hapiRouteMock,
  })),
}));
