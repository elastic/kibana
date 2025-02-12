/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hapiMocks } from '@kbn/hapi-mocks';
import type {
  LifecycleResponseFactory,
  OnPreAuthToolkit,
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
  unprocessableContent: jest.fn(),
  customError: jest.fn(),
});

type ToolkitMock = jest.Mocked<
  OnPreAuthToolkit & OnPreResponseToolkit & OnPostAuthToolkit & OnPreRoutingToolkit
>;

const createToolkitMock = (): ToolkitMock => {
  return {
    render: jest.fn(),
    next: jest.fn(),
    rewriteUrl: jest.fn(),
    authzResultNext: jest.fn(),
  };
};

export const httpServerMock = {
  createKibanaRequest: mockRouter.createKibanaRequest,
  createFakeKibanaRequest: mockRouter.createFakeKibanaRequest,
  createRawRequest: hapiMocks.createRequest,
  createResponseFactory: mockRouter.createResponseFactory,
  createLifecycleResponseFactory: createLifecycleResponseFactoryMock,
  createToolkit: createToolkitMock,
};
