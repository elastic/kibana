/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import type {
  InternalPrebootServicePreboot,
  PrebootService,
} from '@kbn/core-preboot-server-internal';
import type { PrebootServicePreboot } from '@kbn/core-preboot-server';

export type InternalPrebootServicePrebootMock = jest.Mocked<InternalPrebootServicePreboot>;
export type PrebootServicePrebootMock = jest.Mocked<PrebootServicePreboot>;

const createInternalPrebootContractMock = () => {
  const mock: InternalPrebootServicePrebootMock = {
    isSetupOnHold: jest.fn(),
    holdSetupUntilResolved: jest.fn(),
    waitUntilCanSetup: jest.fn(),
  };
  return mock;
};

const createPrebootContractMock = () => {
  const mock: PrebootServicePrebootMock = {
    isSetupOnHold: jest.fn(),
    holdSetupUntilResolved: jest.fn(),
  };

  return mock;
};

type PrebootServiceContract = PublicMethodsOf<PrebootService>;

const createPrebootServiceMock = () => {
  const mocked: jest.Mocked<PrebootServiceContract> = {
    preboot: jest.fn(),
    stop: jest.fn(),
  };
  mocked.preboot.mockReturnValue(createInternalPrebootContractMock());
  return mocked;
};

export const prebootServiceMock = {
  create: createPrebootServiceMock,
  createInternalPrebootContract: createInternalPrebootContractMock,
  createPrebootContract: createPrebootContractMock,
};
