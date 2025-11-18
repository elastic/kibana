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
import { lazyObject } from '@kbn/lazy-object';

const createPrebootContractMock = () => {
  const prebootContract: jest.Mocked<InternalEnvironmentServicePreboot> = lazyObject({
    instanceUuid: 'uuid',
  });
  return prebootContract;
};

const createSetupContractMock = () => {
  const prebootContract: jest.Mocked<InternalEnvironmentServiceSetup> = lazyObject({
    instanceUuid: 'uuid',
  });
  return prebootContract;
};

type EnvironmentServiceContract = PublicMethodsOf<EnvironmentService>;
const createMock = () => {
  const mocked: jest.Mocked<EnvironmentServiceContract> = lazyObject({
    preboot: jest.fn().mockResolvedValue(createPrebootContractMock()),
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
  });
  return mocked;
};

export const environmentServiceMock = {
  create: createMock,
  createPrebootContract: createPrebootContractMock,
  createSetupContract: createSetupContractMock,
};
