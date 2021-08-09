/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Plugin } from 'src/core/public';
import type { ExecutionContextServiceStart } from './execution_context_service';
import type { ExecutionContextContainer } from './execution_context_container';

const createContainerMock = () => {
  const mock: jest.Mocked<PublicMethodsOf<ExecutionContextContainer>> = {
    toHeader: jest.fn(),
    toJSON: jest.fn(),
  };
  return mock;
};
const createStartContractMock = () => {
  const mock: jest.Mocked<ExecutionContextServiceStart> = {
    create: jest.fn().mockReturnValue(createContainerMock()),
  };
  return mock;
};

const createMock = (): jest.Mocked<Plugin> => ({
  setup: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
});

export const executionContextServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
  createContainer: createContainerMock,
};
