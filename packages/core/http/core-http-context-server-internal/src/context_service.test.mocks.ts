/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IContextContainer } from '@kbn/core-http-server';

const createContextMock = (mockContext: any = {}) => {
  const contextMock: jest.Mocked<IContextContainer> = {
    registerContext: jest.fn(),
    createHandler: jest.fn(),
  };
  contextMock.createHandler.mockImplementation(
    (pluginId, handler) =>
      (...args) =>
        Promise.resolve(handler(mockContext, ...args))
  );
  return contextMock;
};

export const MockContextConstructor = jest.fn(createContextMock);
jest.doMock('./context_container', () => ({
  ContextContainer: MockContextConstructor,
}));
