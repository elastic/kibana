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
  ContextService,
  InternalContextSetup,
  InternalContextPreboot,
} from '@kbn/core-http-context-server-internal';
import { contextMock } from './context_container.mock';

const createPrebootContractMock = (mockContext = {}) => {
  const prebootContract: jest.Mocked<InternalContextPreboot> = {
    createContextContainer: jest.fn().mockImplementation(() => contextMock.create(mockContext)),
  };
  return prebootContract;
};

const createSetupContractMock = (mockContext = {}) => {
  const setupContract: jest.Mocked<InternalContextSetup> = {
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
