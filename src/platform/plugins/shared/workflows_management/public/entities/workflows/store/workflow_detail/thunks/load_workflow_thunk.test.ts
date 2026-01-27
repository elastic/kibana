/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';

import { loadWorkflowThunk } from './load_workflow_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';

const mockWorkflow: WorkflowDetailDto = {
  id: 'test-workflow-1',
  name: 'Test Workflow',
  yaml: 'name: Test Workflow\nsteps: []',
  enabled: true,
  createdAt: '2023-01-01T00:00:00Z',
  lastUpdatedAt: '2023-01-01T00:00:00Z',
  createdBy: 'user1',
  lastUpdatedBy: 'user1',
  definition: null,
  valid: true,
};

describe('loadWorkflowThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should load workflow successfully', async () => {
    mockServices.http.get.mockResolvedValue(mockWorkflow);

    const result = await store.dispatch(loadWorkflowThunk({ id: 'test-workflow-1' }));

    expect(result.type).toBe('detail/loadWorkflowThunk/fulfilled');
    expect(result.payload).toEqual(mockWorkflow);
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    mockServices.http.get.mockRejectedValue(error);

    const result = await store.dispatch(loadWorkflowThunk({ id: 'test-workflow-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith('Network Error', {
      title: 'Failed to load workflow',
    });
    expect(result.type).toBe('detail/loadWorkflowThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    mockServices.http.get.mockRejectedValue(error);

    const result = await store.dispatch(loadWorkflowThunk({ id: 'test-workflow-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Failed to load workflow',
      {
        title: 'Failed to load workflow',
      }
    );
    expect(result.type).toBe('detail/loadWorkflowThunk/rejected');
    expect(result.payload).toBe('Failed to load workflow');
  });
});
