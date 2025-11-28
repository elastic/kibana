/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter as createMockRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { WorkflowsManagementApi } from '../workflows_management_api';

export const mockLogger = loggingSystemMock.create().get();

export const createMockRouterInstance = () => createMockRouter.create();

interface MockSpaces {
  getSpaceId: (req: unknown) => Promise<string>;
}

export const createSpacesMock = (id = 'default'): jest.Mocked<MockSpaces> => ({
  getSpaceId: jest.fn().mockReturnValue(id),
});

export const createMockWorkflowsApi = (): WorkflowsManagementApi => {
  // Create a mock object that automatically creates jest.fn() for any property access
  return new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (!target[prop]) {
          target[prop] = jest.fn();
        }
        return target[prop];
      },
    }
  ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const createMockResponse = () => ({
  ok: jest.fn().mockReturnThis(),
  notFound: jest.fn().mockReturnThis(),
  badRequest: jest.fn().mockReturnThis(),
  conflict: jest.fn().mockReturnThis(),
  customError: jest.fn().mockReturnThis(),
});

export const createMockWorkflow = (overrides = {}) => ({
  id: 'workflow-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  steps: [],
  ...overrides,
});

export const createMockWorkflowExecution = (overrides = {}) => ({
  id: 'execution-1',
  workflowId: 'workflow-1',
  status: 'running',
  startedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockStepExecution = (overrides = {}) => ({
  id: 'step-1',
  executionId: 'execution-1',
  stepId: 'step-1',
  status: 'pending',
  ...overrides,
});
