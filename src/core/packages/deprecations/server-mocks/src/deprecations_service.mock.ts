/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeprecationsServiceSetup, DeprecationsClient } from '@kbn/core-deprecations-server';
import type {
  DeprecationsService,
  InternalDeprecationsServiceSetup,
  InternalDeprecationsServiceStart,
} from '@kbn/core-deprecations-server-internal';

type DeprecationsServiceContract = PublicMethodsOf<DeprecationsService>;

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<DeprecationsServiceSetup> = {
    registerDeprecations: jest.fn(),
  };

  return setupContract;
};

const createStartContractMock = () => {
  const mocked: jest.Mocked<InternalDeprecationsServiceStart> = {
    asScopedToClient: jest.fn(),
  };

  mocked.asScopedToClient.mockReturnValue(createClientMock());

  return mocked;
};

const createInternalSetupContractMock = () => {
  const internalSetupContract: jest.Mocked<InternalDeprecationsServiceSetup> = {
    getRegistry: jest.fn(),
  };

  internalSetupContract.getRegistry.mockReturnValue(createSetupContractMock());
  return internalSetupContract;
};

const createDeprecationsServiceMock = () => {
  const mocked: jest.Mocked<DeprecationsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  return mocked;
};

const createClientMock = () => {
  const mocked: jest.Mocked<DeprecationsClient> = {
    getAllDeprecations: jest.fn(),
  };
  mocked.getAllDeprecations.mockResolvedValue([]);
  return mocked;
};

export const deprecationsServiceMock = {
  create: createDeprecationsServiceMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
  createInternalStartContract: createStartContractMock,
  createClient: createClientMock,
};
