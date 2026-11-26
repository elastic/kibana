/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
export const mockHttpServer: Mock = vi.fn();

vi.mock('./http_server', async () => {
  const realHttpServer = await vi.importActual('./http_server');

  const mockedModule = {
    ...realHttpServer,
    HttpServer: mockHttpServer,
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock('./register_lifecycle_handlers', () => {
  const mockedModule = {
    registerCoreHandlers: vi.fn(),
  };
  return { ...mockedModule, default: mockedModule };
});
