/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IExecutionContext,
  InternalExecutionContextSetup,
  ExecutionContextSetup,
} from './execution_context_service';

const createExecutionContextMock = () => {
  const mock: jest.Mocked<IExecutionContext> = {
    set: jest.fn(),
    reset: jest.fn(),
    get: jest.fn(),
    getParentContextFrom: jest.fn(),
  };
  return mock;
};
const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalExecutionContextSetup> = createExecutionContextMock();
  return setupContract;
};

const createSetupContractMock = () => {
  const mock: jest.Mocked<ExecutionContextSetup> = {
    set: jest.fn(),
    get: jest.fn(),
  };
  return mock;
};

export const executionContextServiceMock = {
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
