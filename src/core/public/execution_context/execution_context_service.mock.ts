/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { BehaviorSubject } from 'rxjs';

import { ExecutionContextService, ExecutionContextSetup } from './execution_context_service';

const createContractMock = (): jest.Mocked<ExecutionContextSetup> => ({
  context$: new BehaviorSubject({}),
  clear: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  getAsLabels: jest.fn(),
  withGlobalContext: jest.fn(),
});

const createMock = (): jest.Mocked<PublicMethodsOf<ExecutionContextService>> => ({
  setup: jest.fn().mockReturnValue(createContractMock()),
  start: jest.fn().mockReturnValue(createContractMock()),
  stop: jest.fn(),
});

export const executionContextServiceMock = {
  create: createMock,
  createSetupContract: createContractMock,
  createStartContract: createContractMock,
  createInternalSetupContract: createContractMock,
  createInternalStartContract: createContractMock,
};
