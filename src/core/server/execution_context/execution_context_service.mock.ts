/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ExecutionContextSetup } from './execution_context_service';
import type { IExecutionContext } from './execution_context_client';

const createExecutionContextClientMock = () => {
  const clientMock: jest.Mocked<IExecutionContext> = {
    startWith: jest.fn(),
    stop: jest.fn(),
    get: jest.fn(),
  };
  return clientMock;
};
const createSetupContractMock = () => {
  const setupContract: jest.Mocked<ExecutionContextSetup> = {
    client: createExecutionContextClientMock(),
  };
  return setupContract;
};

export const executionContextServiceMock = {
  createClient: createExecutionContextClientMock,
  createInternalSetupContract: createSetupContractMock,
};
