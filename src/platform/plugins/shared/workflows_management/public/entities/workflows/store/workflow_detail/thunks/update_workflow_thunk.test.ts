/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflow, WorkflowDetailDto } from '@kbn/workflows';

import { updateWorkflowThunk } from './update_workflow_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { setWorkflow } from '../slice';

// Mock the query client
jest.mock('../../../../../shared/lib/query_client', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));
// Set up initial state with workflow and yaml
const mockWorkflow: WorkflowDetailDto = {
  id: 'test-workflow-1',
  name: 'Test Workflow',
  yaml: 'name: Test Workflow\nsteps: []',
  enabled: true,
  createdAt: '2023-01-01T00:00:00Z',
  createdBy: 'user1',
  lastUpdatedAt: '2023-01-01T00:00:00Z',
  lastUpdatedBy: 'user1',
  definition: null,
  valid: true,
};

const { queryClient } = jest.requireMock('../../../../../shared/lib/query_client');

describe('updateWorkflowThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
    store.dispatch(setWorkflow(mockWorkflow));
  });

  it('should update workflow successfully', async () => {
    const workflowUpdate: Partial<EsWorkflow> = {
      name: 'Updated Workflow Name',
      enabled: false,
    };

    mockServices.http.put.mockResolvedValue(undefined);

    const result = await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

    expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
      body: JSON.stringify(workflowUpdate),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workflows', 'test-workflow-1'],
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith('Workflow updated', {
      toastLifeTimeMs: 2000,
    });
    expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
  });

  it('should handle partial workflow updates', async () => {
    const workflowUpdate: Partial<EsWorkflow> = {
      enabled: true,
    };

    mockServices.http.put.mockResolvedValue(undefined);

    const result = await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

    expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
      body: JSON.stringify(workflowUpdate),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workflows', 'test-workflow-1'],
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith('Workflow updated', {
      toastLifeTimeMs: 2000,
    });
    expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
  });

  it('should handle empty workflow updates', async () => {
    const workflowUpdate: Partial<EsWorkflow> = {};

    mockServices.http.put.mockResolvedValue(undefined);

    const result = await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

    expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
      body: JSON.stringify(workflowUpdate),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workflows', 'test-workflow-1'],
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith('Workflow updated', {
      toastLifeTimeMs: 2000,
    });
    expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Update failed' },
      message: 'Bad Request',
    };

    const workflowUpdate: Partial<EsWorkflow> = {
      name: 'Updated Workflow',
    };

    mockServices.http.put.mockRejectedValue(error);

    const result = await store.dispatch(
      updateWorkflowThunk({
        workflow: workflowUpdate,
      })
    );

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Update failed'),
      {
        title: 'Failed to update workflow',
      }
    );
    expect(result.type).toBe('detail/updateWorkflowThunk/rejected');
    expect(result.payload).toBe('Update failed');
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    const workflowUpdate: Partial<EsWorkflow> = {
      enabled: false,
    };

    mockServices.http.put.mockRejectedValue(error);

    const result = await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Network Error'),
      {
        title: 'Failed to update workflow',
      }
    );
    expect(result.type).toBe('detail/updateWorkflowThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    const workflowUpdate: Partial<EsWorkflow> = {
      name: 'Updated Workflow',
    };

    mockServices.http.put.mockRejectedValue(error);

    const result = await store.dispatch(
      updateWorkflowThunk({
        workflow: workflowUpdate,
      })
    );

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Failed to update workflow'),
      {
        title: 'Failed to update workflow',
      }
    );
    expect(result.type).toBe('detail/updateWorkflowThunk/rejected');
    expect(result.payload).toBe('Failed to update workflow');
  });

  it('should handle complex workflow updates', async () => {
    const workflowUpdate: Partial<EsWorkflow> = {
      name: 'Complex Updated Workflow',
      enabled: true,
      description: 'A complex workflow update',
      tags: ['tag1', 'tag2'],
    };

    mockServices.http.put.mockResolvedValue(undefined);

    const result = await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

    expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
      body: JSON.stringify(workflowUpdate),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workflows', 'test-workflow-1'],
    });
    expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith('Workflow updated', {
      toastLifeTimeMs: 2000,
    });
    expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
  });
});
