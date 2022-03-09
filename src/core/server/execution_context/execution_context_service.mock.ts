/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaExecutionContext } from '../../types';
import type {
  IExecutionContext,
  InternalExecutionContextSetup,
  ExecutionContextSetup,
} from './execution_context_service';

// attempted removal of any: unsuccessful! In theory, replaceable with <R>/R
function withContextMock(context: KibanaExecutionContext | undefined, fn: () => any): any {
  return fn();
}

const createExecutionContextMock = () => {
  const mock: jest.Mocked<IExecutionContext> = {
    set: jest.fn(),
    setRequestId: jest.fn(),
    withContext: jest.fn(),
    get: jest.fn(),
    getParentContextFrom: jest.fn(),
    getAsHeader: jest.fn(),
    getAsLabels: jest.fn(),
  };
  mock.withContext.mockImplementation(withContextMock);
  return mock;
};
const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalExecutionContextSetup> = createExecutionContextMock();
  return setupContract;
};

const createSetupContractMock = () => {
  const mock: jest.Mocked<ExecutionContextSetup> = {
    withContext: jest.fn(),
    getAsLabels: jest.fn(),
  };
  mock.withContext.mockImplementation(withContextMock);
  return mock;
};

export const executionContextServiceMock = {
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
