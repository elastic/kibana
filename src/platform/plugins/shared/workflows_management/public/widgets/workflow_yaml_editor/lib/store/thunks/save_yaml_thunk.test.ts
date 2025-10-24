/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows/types/latest';

import { saveYamlThunk } from './save_yaml_thunk';
import { createMockStore, getMockServices } from '../__mocks__/store.mock';
import type { MockServices, MockStore } from '../__mocks__/store.mock';
import { setWorkflow } from '../slice';

// Mock the loadWorkflowThunk
jest.mock('./load_workflow_thunk', () => ({
  loadWorkflowThunk: jest.fn(() => ({ type: 'loadWorkflowThunk/fulfilled' })),
}));

// Mock the query client
jest.mock('../../../../../shared/lib/query_client', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const mockLoadWorkflowThunk = jest.requireMock('./load_workflow_thunk').loadWorkflowThunk;
const { queryClient } = jest.requireMock('../../../../../shared/lib/query_client');

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

describe('saveYamlThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  describe('when updating existing workflow', () => {
    beforeEach(() => {
      store.dispatch(setWorkflow(mockWorkflow));
      store.dispatch({
        type: 'detail/setYamlString',
        payload: 'name: Updated Workflow\nsteps: []',
      });
    });

    it('should save updated workflow successfully', async () => {
      mockServices.http.put.mockResolvedValue(undefined);
      mockLoadWorkflowThunk.mockReturnValue({ type: 'loadWorkflowThunk/fulfilled' });

      const result = await store.dispatch(saveYamlThunk({ id: 'test-workflow-1' }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify({ yaml: 'name: Updated Workflow\nsteps: []' }),
      });
      expect(mockLoadWorkflowThunk).toHaveBeenCalledWith({ id: 'test-workflow-1' });
      expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith('Workflow saved', {
        toastLifeTimeMs: 2000,
      });
      expect(result.type).toBe('detail/saveYamlThunk/fulfilled');
    });

    it('should handle HTTP error when updating', async () => {
      const error = {
        body: { message: 'Update failed' },
        message: 'Bad Request',
      };

      mockServices.http.put.mockRejectedValue(error);

      const result = await store.dispatch(saveYamlThunk({ id: 'test-workflow-1' }));

      expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('Update failed'),
        {
          title: 'Failed to save workflow',
        }
      );
      expect(result.type).toBe('detail/saveYamlThunk/rejected');
      expect(result.payload).toBe('Update failed');
    });
  });

  describe('when creating new workflow', () => {
    beforeEach(() => {
      // Set up initial state with yaml but no workflow
      store.dispatch({ type: 'detail/setYamlString', payload: 'name: New Workflow\nsteps: []' });
    });

    it('should create new workflow successfully', async () => {
      mockServices.http.post.mockResolvedValue(mockWorkflow);

      const result = await store.dispatch(saveYamlThunk({ id: undefined }));

      expect(mockServices.http.post).toHaveBeenCalledWith('/api/workflows', {
        body: JSON.stringify({ yaml: 'name: New Workflow\nsteps: []' }),
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['workflows', undefined],
      });
      expect(mockServices.application.navigateToApp).toHaveBeenCalledWith('workflows', {
        path: 'test-workflow-1',
      });
      expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalledWith('Workflow saved', {
        toastLifeTimeMs: 2000,
      });
      expect(result.type).toBe('detail/saveYamlThunk/fulfilled');
    });

    it('should handle HTTP error when creating', async () => {
      const error = {
        body: { message: 'Creation failed' },
        message: 'Bad Request',
      };

      mockServices.http.post.mockRejectedValue(error);

      const result = await store.dispatch(saveYamlThunk({ id: undefined }));

      expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('Creation failed'),
        {
          title: 'Failed to save workflow',
        }
      );
      expect(result.type).toBe('detail/saveYamlThunk/rejected');
      expect(result.payload).toBe('Creation failed');
    });
  });

  it('should reject when no YAML content to save', async () => {
    // Set up state with empty yaml
    store.dispatch({ type: 'detail/setYamlString', payload: '' });

    const result = await store.dispatch(saveYamlThunk({ id: 'test-workflow-1' }));

    expect(result.type).toBe('detail/saveYamlThunk/rejected');
    expect(result.payload).toBe('No YAML content to save');
  });

  it('should handle error without message', async () => {
    store.dispatch({ type: 'detail/setYamlString', payload: 'name: Test Workflow\nsteps: []' });

    const error = {};
    mockServices.http.put.mockRejectedValue(error);

    const result = await store.dispatch(saveYamlThunk({ id: 'test-workflow-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      new Error('Failed to save workflow'),
      {
        title: 'Failed to save workflow',
      }
    );
    expect(result.type).toBe('detail/saveYamlThunk/rejected');
    expect(result.payload).toBe('Failed to save workflow');
  });
});
