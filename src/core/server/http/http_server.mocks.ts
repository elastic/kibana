/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hapiMocks } from '@kbn/hapi-mocks';
import type {
  LifecycleResponseFactory,
  OnPreResponseToolkit,
  OnPostAuthToolkit,
  OnPreRoutingToolkit,
} from '@kbn/core-http-server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

const createLifecycleResponseFactoryMock = (): jest.Mocked<LifecycleResponseFactory> => ({
  redirected: jest.fn(),
  badRequest: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  conflict: jest.fn(),
  customError: jest.fn(),
});

type ToolkitMock = jest.Mocked<OnPreResponseToolkit & OnPostAuthToolkit & OnPreRoutingToolkit>;

const createToolkitMock = (): ToolkitMock => {
  return {
    render: jest.fn(),
    next: jest.fn(),
    rewriteUrl: jest.fn(),
  };
};

export const httpServerMock = {
  createKibanaRequest: mockRouter.createKibanaRequest,
  createRawRequest: hapiMocks.createRequest,
  createResponseFactory: mockRouter.createResponseFactory,
  createLifecycleResponseFactory: createLifecycleResponseFactoryMock,
  createToolkit: createToolkitMock,
};
