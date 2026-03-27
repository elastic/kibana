/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadWorkflowsThunk } from './load_workflows_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { initialWorkflowsState } from '../slice';

const mockGetWorkflows = jest.fn();

// Mock WorkflowApi class used by the thunk
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getWorkflows: mockGetWorkflows,
  })),
}));

// Mock normalizeFieldsToJsonSchema
jest.mock('@kbn/workflows/spec/lib/field_conversion', () => ({
  normalizeFieldsToJsonSchema: jest.fn((fields) => (fields ? { type: 'object' } : undefined)),
}));

describe('loadWorkflowsThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
  });

  it('should load workflows successfully and build the workflows map', async () => {
    const mockSearchResponse = {
      results: [
        {
          id: 'wf-1',
          name: 'Workflow One',
          definition: { inputs: [{ name: 'input1', type: 'string' }] },
        },
        {
          id: 'wf-2',
          name: 'Workflow Two',
          definition: null,
        },
      ],
      total: 2,
    };

    mockGetWorkflows.mockResolvedValue(mockSearchResponse);

    const result = await store.dispatch(loadWorkflowsThunk());

    expect(mockGetWorkflows).toHaveBeenCalledWith({
      size: 1000,
      page: 1,
    });
    expect(result.type).toBe('detail/loadWorkflowsThunk/fulfilled');
    expect(result.payload).toEqual({
      workflows: {
        'wf-1': {
          id: 'wf-1',
          name: 'Workflow One',
          inputsSchema: { type: 'object' },
        },
        'wf-2': {
          id: 'wf-2',
          name: 'Workflow Two',
          inputsSchema: undefined,
        },
      },
      totalWorkflows: 2,
    });
  });

  it('should dispatch setWorkflows with the correct data on success', async () => {
    const mockSearchResponse = {
      results: [
        {
          id: 'wf-1',
          name: 'Workflow One',
          definition: null,
        },
      ],
      total: 1,
    };

    mockGetWorkflows.mockResolvedValue(mockSearchResponse);

    await store.dispatch(loadWorkflowsThunk());

    const state = store.getState();
    expect(state.detail.workflows).toEqual({
      workflows: {
        'wf-1': {
          id: 'wf-1',
          name: 'Workflow One',
          inputsSchema: undefined,
        },
      },
      totalWorkflows: 1,
    });
  });

  it('should handle zero total gracefully', async () => {
    const mockSearchResponse = {
      results: [],
      total: 0,
    };

    mockGetWorkflows.mockResolvedValue(mockSearchResponse);

    const result = await store.dispatch(loadWorkflowsThunk());

    expect(result.type).toBe('detail/loadWorkflowsThunk/fulfilled');
    expect(result.payload).toEqual({
      workflows: {},
      totalWorkflows: 0,
    });
  });

  it('should handle undefined total as 0', async () => {
    const mockSearchResponse = {
      results: [],
      total: undefined,
    };

    mockGetWorkflows.mockResolvedValue(mockSearchResponse);

    const result = await store.dispatch(loadWorkflowsThunk());

    expect(result.type).toBe('detail/loadWorkflowsThunk/fulfilled');
    expect(result.payload).toEqual({
      workflows: {},
      totalWorkflows: 0,
    });
  });

  it('should show toast and dispatch initialWorkflowsState on error with body message', async () => {
    const error = {
      body: { message: 'Search failed' },
      message: 'Bad Request',
    };

    mockGetWorkflows.mockRejectedValue(error);

    const result = await store.dispatch(loadWorkflowsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to load workflows',
    });
    expect(result.type).toBe('detail/loadWorkflowsThunk/rejected');
    expect(result.payload).toBe('Search failed');

    // Store should be reset to initial state
    const state = store.getState();
    expect(state.detail.workflows).toEqual(initialWorkflowsState);
  });

  it('should show toast and dispatch initialWorkflowsState on error with message property', async () => {
    const error = new Error('Network Error');

    mockGetWorkflows.mockRejectedValue(error);

    const result = await store.dispatch(loadWorkflowsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to load workflows',
    });
    expect(result.type).toBe('detail/loadWorkflowsThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should show toast with default message on error without message', async () => {
    const error = {};

    mockGetWorkflows.mockRejectedValue(error);

    const result = await store.dispatch(loadWorkflowsThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to load workflows',
    });
    expect(result.type).toBe('detail/loadWorkflowsThunk/rejected');
    expect(result.payload).toBe('Failed to load workflows');

    const state = store.getState();
    expect(state.detail.workflows).toEqual(initialWorkflowsState);
  });
});
