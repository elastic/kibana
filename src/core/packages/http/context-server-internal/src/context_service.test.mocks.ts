/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { IContextContainer } from '@kbn/core-http-server';

const createContextMock = (mockContext: any = {}) => {
  const contextMock: Mocked<IContextContainer> = {
    registerContext: vi.fn(),
    createHandler: vi.fn(),
  };
  contextMock.createHandler.mockImplementation(
    (pluginId, handler) =>
      (...args) =>
        Promise.resolve(handler(mockContext, ...args))
  );
  return contextMock;
};

export const MockContextConstructor = vi.fn(createContextMock);
vi.doMock('./context_container', () => {
      const mocked = {
      ContextContainer: MockContextConstructor,
    };
      return { ...mocked, default: mocked };
    });
