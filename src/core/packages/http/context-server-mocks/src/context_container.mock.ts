/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IContextContainer,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core-http-server';
import { lazyObject } from '@kbn/lazy-object';

export type ContextContainerMock = jest.Mocked<IContextContainer>;

const createContextMock = (mockContext: any = {}) => {
  const contextMock: ContextContainerMock = lazyObject({
    registerContext: jest.fn(),
    createHandler: jest.fn().mockImplementation(
      (pluginId, handler) =>
        (
          ...args: [KibanaRequest<unknown, unknown, unknown, any>, response: KibanaResponseFactory]
        ) =>
          Promise.resolve(handler(mockContext, ...args))
    ),
  });
  return contextMock;
};

export const contextMock = {
  create: createContextMock,
};
