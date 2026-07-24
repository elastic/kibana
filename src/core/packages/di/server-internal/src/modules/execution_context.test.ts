/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreSetup, ExecutionContext } from '@kbn/core-di-server';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import type { CoreSetup as TCoreSetup } from '@kbn/core-lifecycle-server';
import { loadExecutionContext } from './execution_context';

describe('loadExecutionContext', () => {
  let container: Container;
  let executionContext: jest.Mocked<TCoreSetup['executionContext']>;

  beforeEach(() => {
    executionContext = executionContextServiceMock.createSetupContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadExecutionContext));
    container.bind(CoreSetup('executionContext')).toConstantValue(executionContext);
  });

  it('should resolve the execution context service', () => {
    expect(container.get(ExecutionContext)).toBe(executionContext);
  });
});
