/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IContextContainer } from './context';

export type ContextContainerMock = jest.Mocked<IContextContainer>;

const createContextMock = (mockContext: any = {}) => {
  const contextMock: ContextContainerMock = {
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

export const contextMock = {
  create: createContextMock,
};
