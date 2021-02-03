/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { httpServerMock } from '../http/http_server.mocks';
import { HttpResources, HttpResourcesServiceToolkit } from './types';

const createHttpResourcesMock = (): jest.Mocked<HttpResources> => ({
  register: jest.fn(),
});

function createInternalHttpResourcesSetup() {
  return {
    createRegistrar: jest.fn(() => createHttpResourcesMock()),
  };
}

function createHttpResourcesResponseFactory() {
  const mocked: jest.Mocked<HttpResourcesServiceToolkit> = {
    renderCoreApp: jest.fn(),
    renderAnonymousCoreApp: jest.fn(),
    renderHtml: jest.fn(),
    renderJs: jest.fn(),
  };

  return {
    ...httpServerMock.createResponseFactory(),
    ...mocked,
  };
}

export const httpResourcesMock = {
  createRegistrar: createHttpResourcesMock,
  createSetupContract: createInternalHttpResourcesSetup,
  createResponseFactory: createHttpResourcesResponseFactory,
};
