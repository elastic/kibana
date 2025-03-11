/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
  RenderingService,
} from '@kbn/core-rendering-server-internal';

export type RenderingServiceMock = jest.Mocked<PublicMethodsOf<RenderingService>>;

function createRenderingPreboot() {
  const mocked: jest.Mocked<InternalRenderingServicePreboot> = {
    render: jest.fn().mockResolvedValue('<body />'),
  };
  return mocked;
}

function createRenderingSetup() {
  const mocked: jest.Mocked<InternalRenderingServiceSetup> = {
    render: jest.fn().mockResolvedValue('<body />'),
  };
  return mocked;
}

function createRenderingService() {
  const mock: RenderingServiceMock = {
    preboot: jest.fn(),
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mock.preboot.mockResolvedValue(createRenderingPreboot());
  mock.setup.mockResolvedValue(createRenderingSetup());

  return mock;
}

export const renderingServiceMock = {
  create: createRenderingService,
  createPrebootContract: createRenderingPreboot,
  createSetupContract: createRenderingSetup,
};
