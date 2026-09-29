/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const configureClientMock = vi.fn();
vi.doMock('./configure_client', () => {
  const mocked = {
    configureClient: configureClientMock,
  };
  return { ...mocked, default: mocked };
});

export const createTransportMock = vi.fn();
vi.doMock('./create_transport', () => {
  const mocked = {
    createTransport: createTransportMock,
  };
  return { ...mocked, default: mocked };
});

export const createInternalErrorHandlerMock = vi.fn();
vi.doMock('./retry_unauthorized', () => {
  const mocked = {
    createInternalErrorHandler: createInternalErrorHandlerMock,
  };
  return { ...mocked, default: mocked };
});
