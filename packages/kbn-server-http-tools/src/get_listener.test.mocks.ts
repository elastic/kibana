/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getServerTLSOptionsMock = jest.fn();

jest.doMock('./get_tls_options', () => {
  const actual = jest.requireActual('./get_tls_options');
  return {
    ...actual,
    getServerTLSOptions: getServerTLSOptionsMock,
  };
});

export const createHttpServerMock = jest.fn(() => {
  return {
    on: jest.fn(),
    setTimeout: jest.fn(),
  };
});

jest.doMock('http', () => {
  const actual = jest.requireActual('http');
  return {
    ...actual,
    createServer: createHttpServerMock,
  };
});

export const createHttpsServerMock = jest.fn(() => {
  return {
    on: jest.fn(),
    setTimeout: jest.fn(),
  };
});

jest.doMock('https', () => {
  const actual = jest.requireActual('https');
  return {
    ...actual,
    createServer: createHttpsServerMock,
  };
});

export const createHttp2SecureServerMock = jest.fn(() => {
  return {
    on: jest.fn(),
    setTimeout: jest.fn(),
  };
});

export const createHttp2UnsecureServerMock = jest.fn(() => {
  return {
    on: jest.fn(),
    setTimeout: jest.fn(),
  };
});

jest.doMock('http2', () => {
  const actual = jest.requireActual('https');
  return {
    ...actual,
    createServer: createHttp2UnsecureServerMock,
    createSecureServer: createHttp2SecureServerMock,
  };
});
