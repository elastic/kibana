/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getServerTLSOptionsMock = vi.fn();

vi.doMock('./get_tls_options', async () => {
  const actual = (await vi.importActual('./get_tls_options'));
  return {
    ...actual,
    getServerTLSOptions: getServerTLSOptionsMock,
  };
});

export const createHttpServerMock = vi.fn(() => {
  return {
    on: vi.fn(),
    setTimeout: vi.fn(),
  };
});

vi.doMock('http', () => {
  const actual = require('http');
  return {
    ...actual,
    createServer: createHttpServerMock,
  };
});

export const createHttpsServerMock = vi.fn(() => {
  return {
    on: vi.fn(),
    setTimeout: vi.fn(),
  };
});

vi.doMock('https', () => {
  const actual = require('https');
  return {
    ...actual,
    createServer: createHttpsServerMock,
  };
});

export const createHttp2SecureServerMock = vi.fn(() => {
  return {
    on: vi.fn(),
    setTimeout: vi.fn(),
  };
});

export const createHttp2UnsecureServerMock = vi.fn(() => {
  return {
    on: vi.fn(),
    setTimeout: vi.fn(),
  };
});

vi.doMock('http2', () => {
  const actual = require('https');
  return {
    ...actual,
    createServer: createHttp2UnsecureServerMock,
    createSecureServer: createHttp2SecureServerMock,
  };
});
