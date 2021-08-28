/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import { ContextService, ContextSetup, InternalContextPreboot } from './context_service';
import { contextMock } from './container/context.mock';

const createPrebootContractMock = (mockContext = {}) => {
  const prebootContract: jest.Mocked<InternalContextPreboot> = {
    createContextContainer: jest.fn().mockImplementation(() => contextMock.create(mockContext)),
  };
  return prebootContract;
};

const createSetupContractMock = (mockContext = {}) => {
  const setupContract: jest.Mocked<ContextSetup> = {
    createContextContainer: jest.fn().mockImplementation(() => contextMock.create(mockContext)),
  };
  return setupContract;
};

type ContextServiceContract = PublicMethodsOf<ContextService>;
const createMock = () => {
  const mocked: jest.Mocked<ContextServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
  };
  mocked.preboot.mockReturnValue(createPrebootContractMock());
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const contextServiceMock = {
  create: createMock,
  createPrebootContract: createPrebootContractMock,
  createSetupContract: createSetupContractMock,
};
