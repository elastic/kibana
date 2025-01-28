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
  EnvironmentService,
  InternalEnvironmentServicePreboot,
  InternalEnvironmentServiceSetup,
} from '@kbn/core-environment-server-internal';

const createPrebootContractMock = () => {
  const prebootContract: jest.Mocked<InternalEnvironmentServicePreboot> = {
    instanceUuid: 'uuid',
  };
  return prebootContract;
};

const createSetupContractMock = () => {
  const prebootContract: jest.Mocked<InternalEnvironmentServiceSetup> = {
    instanceUuid: 'uuid',
  };
  return prebootContract;
};

type EnvironmentServiceContract = PublicMethodsOf<EnvironmentService>;
const createMock = () => {
  const mocked: jest.Mocked<EnvironmentServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
  };
  mocked.preboot.mockResolvedValue(createPrebootContractMock());
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const environmentServiceMock = {
  create: createMock,
  createPrebootContract: createPrebootContractMock,
  createSetupContract: createSetupContractMock,
};
