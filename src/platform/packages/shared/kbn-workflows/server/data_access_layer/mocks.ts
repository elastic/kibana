/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionsDataAccess, WorkflowExecutionsDataAccess } from './types';

export const createMockWorkflowExecutionsDal = (
  overrides: Partial<jest.Mocked<WorkflowExecutionsDataAccess>> = {}
): jest.Mocked<WorkflowExecutionsDataAccess> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    deleteByQuery: jest.fn(),
    ...overrides,
  }) as jest.Mocked<WorkflowExecutionsDataAccess>;

export const createMockStepExecutionsDal = (
  overrides: Partial<jest.Mocked<StepExecutionsDataAccess>> = {}
): jest.Mocked<StepExecutionsDataAccess> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    getByIds: jest.fn(),
    bulk: jest.fn(),
    deleteByQuery: jest.fn(),
    ...overrides,
  }) as jest.Mocked<StepExecutionsDataAccess>;
