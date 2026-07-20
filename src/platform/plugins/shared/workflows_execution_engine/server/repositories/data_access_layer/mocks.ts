/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GetExecutionsByIdsResponse,
  StepExecutionsDataAccess,
  WorkflowExecutionsDataAccess,
} from './types';

export const createMockGetExecutionsByIdsResponse = <TExecution extends { id: string }>(
  documents: TExecution[],
  options: {
    index?: string;
    missing?: (string | { id: string; index: string })[];
  } = {}
): GetExecutionsByIdsResponse<TExecution> => ({
  items: documents.map((document) => ({
    document,
    index: options.index ?? '.workflows-executions',
  })),
  missing: options.missing ?? [],
});

export const createMockWorkflowExecutionsDataAccess = (
  overrides: Partial<jest.Mocked<WorkflowExecutionsDataAccess>> = {}
): jest.Mocked<WorkflowExecutionsDataAccess> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    scriptUpdate: jest.fn(),
    deleteByQuery: jest.fn(),
    ...overrides,
  } as jest.Mocked<WorkflowExecutionsDataAccess>);

export const createMockStepExecutionsDataAccess = (
  overrides: Partial<jest.Mocked<StepExecutionsDataAccess>> = {}
): jest.Mocked<StepExecutionsDataAccess> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    scriptUpdate: jest.fn(),
    deleteByQuery: jest.fn(),
    ...overrides,
  } as jest.Mocked<StepExecutionsDataAccess>);
