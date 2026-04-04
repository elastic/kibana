/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { loadExecutionThunk } from './load_execution_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';

const mockGetExecution = jest.fn();

// Mock the WorkflowApi class so loadExecutionThunk uses our mock
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecution: mockGetExecution,
  })),
}));

// Mock the computation utility
jest.mock('../utils/computation', () => ({
  performComputation: jest.fn(() => ({
    yamlDocument: {},
    yamlLineCounter: {},
    workflowLookup: { steps: {} },
  })),
}));

const mockExecution: WorkflowExecutionDto = {
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  error: null,
  finishedAt: '2024-01-01T00:01:00Z',
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  workflowDefinition: {
    name: 'Test',
    steps: [],
    triggers: [{ type: 'manual' }],
    version: '1',
    enabled: true,
  },
  stepExecutions: [],
  duration: 60000,
  yaml: 'name: Test\nsteps: []',
};

describe('loadExecutionThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should load execution successfully', async () => {
    mockGetExecution.mockResolvedValue(mockExecution);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockGetExecution).toHaveBeenCalledWith('exec-1', {
      includeInput: false,
      includeOutput: false,
    });
    expect(result.type).toBe('detail/loadExecutionThunk/fulfilled');
    expect(result.payload).toEqual(mockExecution);
  });

  it('should set execution in the store on success', async () => {
    mockGetExecution.mockResolvedValue(mockExecution);

    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    const state = store.getState();
    expect(state.detail.execution).toEqual(mockExecution);
  });

  it('should compute execution data for a new execution id', async () => {
    const { performComputation } = jest.requireMock('../utils/computation');
    mockGetExecution.mockResolvedValue(mockExecution);

    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(performComputation).toHaveBeenCalledWith(
      mockExecution.yaml,
      mockExecution.workflowDefinition
    );
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Execution not found' },
      message: 'Not Found',
    };

    mockGetExecution.mockRejectedValue(error);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith('Execution not found', {
      title: 'Failed to load execution',
    });
    expect(result.type).toBe('detail/loadExecutionThunk/rejected');
    expect(result.payload).toBe('Execution not found');
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    mockGetExecution.mockRejectedValue(error);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith('Network Error', {
      title: 'Failed to load execution',
    });
    expect(result.type).toBe('detail/loadExecutionThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    mockGetExecution.mockRejectedValue(error);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Failed to load execution',
      {
        title: 'Failed to load execution',
      }
    );
    expect(result.type).toBe('detail/loadExecutionThunk/rejected');
    expect(result.payload).toBe('Failed to load execution');
  });
});
