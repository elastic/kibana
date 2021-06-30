/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ExecutionContextServiceStart } from './execution_context_service';
import type { ExecutionContextContainer } from './execution_context_container';

const creteContainerMock = () => {
  const mock: jest.Mocked<PublicMethodsOf<ExecutionContextContainer>> = {
    toHeader: jest.fn(),
  };
  return mock;
};
const createStartContractMock = () => {
  const mock: jest.Mocked<ExecutionContextServiceStart> = {
    create: jest.fn().mockReturnValue(creteContainerMock()),
  };
  return mock;
};

export const executionContextServiceMock = {
  createStartContract: createStartContractMock,
};
