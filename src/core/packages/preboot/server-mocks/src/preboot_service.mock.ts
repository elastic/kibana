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
  InternalPrebootServicePreboot,
  PrebootService,
} from '@kbn/core-preboot-server-internal';
import type { PrebootServicePreboot } from '@kbn/core-preboot-server';
import { lazyObject } from '@kbn/lazy-object';

export type InternalPrebootServicePrebootMock = jest.Mocked<InternalPrebootServicePreboot>;
export type PrebootServicePrebootMock = jest.Mocked<PrebootServicePreboot>;

const createInternalPrebootContractMock = () => {
  const mock: InternalPrebootServicePrebootMock = lazyObject({
    isSetupOnHold: jest.fn(),
    holdSetupUntilResolved: jest.fn(),
    waitUntilCanSetup: jest.fn(),
  });
  return mock;
};

const createPrebootContractMock = () => {
  const mock: PrebootServicePrebootMock = lazyObject({
    isSetupOnHold: jest.fn(),
    holdSetupUntilResolved: jest.fn(),
  });

  return mock;
};

type PrebootServiceContract = PublicMethodsOf<PrebootService>;

const createPrebootServiceMock = () => {
  const mocked: jest.Mocked<PrebootServiceContract> = lazyObject({
    preboot: jest.fn().mockReturnValue(createInternalPrebootContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const prebootServiceMock = {
  create: createPrebootServiceMock,
  createInternalPrebootContract: createInternalPrebootContractMock,
  createPrebootContract: createPrebootContractMock,
};
