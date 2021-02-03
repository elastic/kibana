/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { EnvironmentService, InternalEnvironmentServiceSetup } from './environment_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalEnvironmentServiceSetup> = {
    instanceUuid: 'uuid',
  };
  return setupContract;
};

type EnvironmentServiceContract = PublicMethodsOf<EnvironmentService>;
const createMock = () => {
  const mocked: jest.Mocked<EnvironmentServiceContract> = {
    setup: jest.fn(),
  };
  mocked.setup.mockResolvedValue(createSetupContractMock());
  return mocked;
};

export const environmentServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
