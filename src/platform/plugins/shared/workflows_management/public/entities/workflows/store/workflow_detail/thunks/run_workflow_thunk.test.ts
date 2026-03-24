/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { runWorkflowThunk } from './run_workflow_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';

describe('runWorkflowThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  const mockWorkflow = {
    id: 'workflow-1',
  } as WorkflowDetailDto;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should run workflow successfully', async () => {
    const mockResponse = {
      workflowExecutionId: 'execution-123',
    };

    const testInputs = {
      param1: 'value1',
      param2: 'value2',
    };

    // Set up state with mock workflow
    store.dispatch({ type: 'detail/setWorkflow', payload: mockWorkflow });

    mockServices.http.post.mockResolvedValue(mockResponse);

    const result = await store.dispatch(runWorkflowThunk({ inputs: testInputs }));

    expect(mockServices.http.post).toHaveBeenCalledWith(`/api/workflows/${mockWorkflow.id}/run`, {
      body: JSON.stringify({
        inputs: testInputs,
      }),
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Workflow execution started',
      { toastLifeTimeMs: 2000 }
    );
    expect(result.type).toBe('detail/runWorkflowThunk/fulfilled');
    expect(result.payload).toEqual(mockResponse);
  });

  it('should reject when no workflow in state', async () => {
    // Set up state with no workflow
    store.dispatch({ type: 'detail/setWorkflow', payload: null });

    const result = await store.dispatch(runWorkflowThunk({ inputs: {} }));

    expect(result.type).toBe('detail/runWorkflowThunk/rejected');
    expect(result.payload).toBe('No workflow to run');
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Failed to run workflow' },
      message: 'Bad Request',
    };

    store.dispatch({ type: 'detail/setWorkflow', payload: mockWorkflow });
    mockServices.http.post.mockRejectedValue(error);

    const result = await store.dispatch(runWorkflowThunk({ inputs: {} }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Failed to run workflow'),
      {
        title: 'Failed to run workflow',
      }
    );
    expect(result.type).toBe('detail/runWorkflowThunk/rejected');
    expect(result.payload).toBe('Failed to run workflow');
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    store.dispatch({ type: 'detail/setWorkflow', payload: mockWorkflow });
    mockServices.http.post.mockRejectedValue(error);

    const result = await store.dispatch(runWorkflowThunk({ inputs: {} }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Network Error'),
      {
        title: 'Failed to run workflow',
      }
    );
    expect(result.type).toBe('detail/runWorkflowThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    store.dispatch({ type: 'detail/setWorkflow', payload: mockWorkflow });
    mockServices.http.post.mockRejectedValue(error);

    const result = await store.dispatch(runWorkflowThunk({ inputs: {} }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Failed to run workflow'),
      {
        title: 'Failed to run workflow',
      }
    );
    expect(result.type).toBe('detail/runWorkflowThunk/rejected');
    expect(result.payload).toBe('Failed to run workflow');
  });

  it('should handle empty inputs object', async () => {
    const mockResponse = {
      workflowExecutionId: 'execution-456',
    };

    store.dispatch({ type: 'detail/setWorkflow', payload: mockWorkflow });
    mockServices.http.post.mockResolvedValue(mockResponse);

    const result = await store.dispatch(runWorkflowThunk({ inputs: {} }));

    expect(mockServices.http.post).toHaveBeenCalledWith(`/api/workflows/${mockWorkflow.id}/run`, {
      body: JSON.stringify({
        inputs: {},
      }),
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Workflow execution started',
      { toastLifeTimeMs: 2000 }
    );
    expect(result.type).toBe('detail/runWorkflowThunk/fulfilled');
    expect(result.payload).toEqual(mockResponse);
  });
});
