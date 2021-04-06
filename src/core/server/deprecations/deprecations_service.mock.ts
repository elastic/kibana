/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  DeprecationsService,
  InternalDeprecationsServiceSetup,
  DeprecationsServiceSetup,
} from './deprecations_service';
type DeprecationsServiceContract = PublicMethodsOf<DeprecationsService>;

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<DeprecationsServiceSetup> = {
    registerDeprecations: jest.fn(),
  };

  return setupContract;
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

  mocked.setup.mockReturnValue(createInternalSetupContractMock());
  return mocked;
};

export const deprecationsServiceMock = {
  create: createDeprecationsServiceMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
};
