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
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from './types';

export const createMockGetExecutionsByIdsResponse = <TExecution extends { id: string }>(
  documents: TExecution[],
  options: {
    index?: string;
    missing?: string[];
  } = {}
): GetExecutionsByIdsResponse<TExecution> => ({
  items: documents.map((document) => ({
    document,
    index: options.index ?? '.workflows-executions',
  })),
  missing: options.missing ?? [],
});

export const createMockWorkflowDataClient = (
  overrides: Partial<jest.Mocked<WorkflowExecutionsDataClient>> = {}
): jest.Mocked<WorkflowExecutionsDataClient> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    scriptUpdate: jest.fn(),
    deleteByQuery: jest.fn(),
    ...overrides,
  } as jest.Mocked<WorkflowExecutionsDataClient>);

export const createMockStepDataClient = (
  overrides: Partial<jest.Mocked<StepExecutionsDataClient>> = {}
): jest.Mocked<StepExecutionsDataClient> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    scriptUpdate: jest.fn(),
    deleteByQuery: jest.fn(),
    ...overrides,
  } as jest.Mocked<StepExecutionsDataClient>);
