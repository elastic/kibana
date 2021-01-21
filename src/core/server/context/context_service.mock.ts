/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import { ContextService, ContextSetup } from './context_service';
import { contextMock } from '../../utils/context.mock';

const createSetupContractMock = (mockContext = {}) => {
  const setupContract: jest.Mocked<ContextSetup> = {
    createContextContainer: jest.fn().mockImplementation(() => contextMock.create(mockContext)),
  };
  return setupContract;
};

type ContextServiceContract = PublicMethodsOf<ContextService>;
const createMock = () => {
  const mocked: jest.Mocked<ContextServiceContract> = {
    setup: jest.fn(),
  };
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const contextServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
