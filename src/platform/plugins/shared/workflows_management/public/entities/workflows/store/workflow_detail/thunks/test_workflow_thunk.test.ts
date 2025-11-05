/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { testWorkflowThunk } from './test_workflow_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';

describe('testWorkflowThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should test workflow successfully', async () => {
    const mockResponse = {
      workflowExecutionId: 'execution-123',
    };

    const testInputs = {
      param1: 'value1',
      param2: 'value2',
    };

    // Set up state with yaml content
    store.dispatch({ type: 'detail/setYamlString', payload: 'name: Test Workflow\nsteps: []' });

    mockServices.http.post.mockResolvedValue(mockResponse);

    const result = await store.dispatch(testWorkflowThunk({ inputs: testInputs }));

    expect(mockServices.http.post).toHaveBeenCalledWith('/api/workflows/test', {
      body: JSON.stringify({
        workflowYaml: 'name: Test Workflow\nsteps: []',
        inputs: testInputs,
      }),
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Workflow test execution started',
      { toastLifeTimeMs: 2000 }
    );
    expect(result.type).toBe('detail/testWorkflowThunk/fulfilled');
    expect(result.payload).toEqual(mockResponse);
  });

  it('should reject when no YAML content to test', async () => {
    // Set up state with empty yaml
    store.dispatch({ type: 'detail/setYamlString', payload: '' });

    const result = await store.dispatch(testWorkflowThunk({ inputs: {} }));

    expect(result.type).toBe('detail/testWorkflowThunk/rejected');
    expect(result.payload).toBe('No YAML content to test');
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Workflow test failed' },
      message: 'Bad Request',
    };

    store.dispatch({ type: 'detail/setYamlString', payload: 'name: Test Workflow\nsteps: []' });
    mockServices.http.post.mockRejectedValue(error);

    const result = await store.dispatch(testWorkflowThunk({ inputs: {} }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Workflow test failed'),
      {
        title: 'Failed to test workflow',
      }
    );
    expect(result.type).toBe('detail/testWorkflowThunk/rejected');
    expect(result.payload).toBe('Workflow test failed');
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    store.dispatch({ type: 'detail/setYamlString', payload: 'name: Test Workflow\nsteps: []' });
    mockServices.http.post.mockRejectedValue(error);

    const result = await store.dispatch(testWorkflowThunk({ inputs: {} }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Network Error'),
      {
        title: 'Failed to test workflow',
      }
    );
    expect(result.type).toBe('detail/testWorkflowThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    store.dispatch({ type: 'detail/setYamlString', payload: 'name: Test Workflow\nsteps: []' });
    mockServices.http.post.mockRejectedValue(error);

    const result = await store.dispatch(testWorkflowThunk({ inputs: {} }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Failed to test workflow'),
      {
        title: 'Failed to test workflow',
      }
    );
    expect(result.type).toBe('detail/testWorkflowThunk/rejected');
    expect(result.payload).toBe('Failed to test workflow');
  });

  it('should handle empty inputs object', async () => {
    const mockResponse = {
      workflowExecutionId: 'execution-456',
    };

    store.dispatch({ type: 'detail/setYamlString', payload: 'name: Test Workflow\nsteps: []' });
    mockServices.http.post.mockResolvedValue(mockResponse);

    const result = await store.dispatch(testWorkflowThunk({ inputs: {} }));

    expect(mockServices.http.post).toHaveBeenCalledWith('/api/workflows/test', {
      body: JSON.stringify({
        workflowYaml: 'name: Test Workflow\nsteps: []',
        inputs: {},
      }),
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Workflow test execution started',
      { toastLifeTimeMs: 2000 }
    );
    expect(result.type).toBe('detail/testWorkflowThunk/fulfilled');
    expect(result.payload).toEqual(mockResponse);
  });
});
