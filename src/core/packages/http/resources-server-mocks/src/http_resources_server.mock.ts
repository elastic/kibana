/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { HttpResourcesService } from '@kbn/core-http-resources-server-internal';
import type { HttpResources, HttpResourcesServiceToolkit } from '@kbn/core-http-resources-server';
import { lazyObject } from '@kbn/lazy-object';

export type HttpResourcesMock = jest.Mocked<PublicMethodsOf<HttpResourcesService>>;

function createHttpResourcesService() {
  const mock: HttpResourcesMock = lazyObject({
    preboot: jest.fn(),
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  });

  mock.preboot.mockReturnValue(createInternalHttpResourcesPreboot());
  mock.setup.mockReturnValue(createInternalHttpResourcesSetup());

  return mock;
}

const createHttpResourcesMock = (): jest.Mocked<HttpResources> =>
  lazyObject({
    register: jest.fn(),
  });

function createInternalHttpResourcesPreboot() {
  return lazyObject({
    createRegistrar: jest.fn(() => createHttpResourcesMock()),
  });
}

function createInternalHttpResourcesSetup() {
  return createInternalHttpResourcesPreboot();
}

function createHttpResourcesResponseFactory() {
  const mocked: jest.Mocked<HttpResourcesServiceToolkit> = lazyObject({
    renderCoreApp: jest.fn(),
    renderAnonymousCoreApp: jest.fn(),
    renderHtml: jest.fn(),
    renderJs: jest.fn(),
    renderCss: jest.fn(),
  });

  return {
    ...httpServerMock.createResponseFactory(),
    ...mocked,
  };
}

export const httpResourcesMock = {
  create: createHttpResourcesService,
  createRegistrar: createHttpResourcesMock,
  createPrebootContract: createInternalHttpResourcesPreboot,
  createSetupContract: createInternalHttpResourcesSetup,
  createResponseFactory: createHttpResourcesResponseFactory,
};
