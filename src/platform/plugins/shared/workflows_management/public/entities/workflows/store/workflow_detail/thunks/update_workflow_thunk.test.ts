/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';

import type { EsWorkflow, WorkflowDetailDto } from '@kbn/workflows';

import { updateWorkflowThunk } from './update_workflow_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import type { RootState } from '../../types';
import { selectYamlString } from '../selectors';
import { setWorkflow, setYamlString } from '../slice';

// Mock the loadWorkflowThunk
jest.mock('./load_workflow_thunk');
// eslint-disable-next-line import/order
import { loadWorkflowThunk } from './load_workflow_thunk';
const mockLoadWorkflowThunk = loadWorkflowThunk as jest.MockedFunction<typeof loadWorkflowThunk>;

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
  // Type assertion helper for dispatch to work around TypeScript inference issues with mock store
  const dispatchThunk = (action: any) => store.dispatch(action as any);

  beforeEach(() => {
    jest.clearAllMocks();

    store = createMockStore();
    mockServices = getMockServices(store);
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setYamlString(mockWorkflow.yaml));

    // Default mock implementation for loadWorkflowThunk
    // Server now preserves formatting, so it returns the same YAML with updated fields
    // The server also updates the workflow object to match the YAML
    mockLoadWorkflowThunk.mockImplementation(((arg: any) => {
      return async (dispatch: any) => {
        const currentYaml = selectYamlString(store.getState() as RootState) ?? '';

        // Parse YAML to extract updated field values (server syncs workflow object with YAML)
        let parsedData: Record<string, any> = {};
        try {
          const doc = parseDocument(currentYaml);
          parsedData = doc.toJS() as Record<string, any>;
        } catch {
          // If parsing fails, use existing workflow values
        }

        // Get current workflow to preserve definition if it exists
        const currentState = store.getState() as RootState;
        const currentWorkflow = currentState.detail.workflow;

        // Update definition object to match YAML (server syncs these)
        // Server only updates definition if it exists, but for test purposes we create it if needed
        let updatedDefinition = currentWorkflow?.definition;
        if (
          updatedDefinition ||
          parsedData.name ||
          parsedData.enabled !== undefined ||
          parsedData.description ||
          parsedData.tags
        ) {
          // If definition exists, update it; otherwise create a minimal one with updated fields
          if (updatedDefinition) {
            updatedDefinition = {
              ...updatedDefinition,
              ...(parsedData.name !== undefined && { name: parsedData.name }),
              ...(parsedData.enabled !== undefined && { enabled: parsedData.enabled }),
              ...(parsedData.description !== undefined && { description: parsedData.description }),
              ...(parsedData.tags !== undefined && { tags: parsedData.tags }),
            };
          } else if (
            parsedData.name ||
            parsedData.enabled !== undefined ||
            parsedData.description ||
            parsedData.tags
          ) {
            // Create a minimal definition with the updated fields and required fields from parsed YAML
            updatedDefinition = {
              version: '1' as const,
              name: parsedData.name ?? currentWorkflow?.name ?? 'Test Workflow',
              enabled: parsedData.enabled ?? currentWorkflow?.enabled ?? true,
              triggers: parsedData.triggers ?? [],
              steps: parsedData.steps ?? [],
              ...(parsedData.description !== undefined && { description: parsedData.description }),
              ...(parsedData.tags !== undefined && { tags: parsedData.tags }),
            };
          }
        }

        const updatedWorkflow: WorkflowDetailDto = {
          ...mockWorkflow,
          yaml: currentYaml, // Server preserves the YAML formatting
          // Update workflow fields to match what's in the YAML (server syncs these)
          ...(parsedData.name !== undefined && { name: parsedData.name }),
          ...(parsedData.enabled !== undefined && { enabled: parsedData.enabled }),
          ...(parsedData.description !== undefined && { description: parsedData.description }),
          ...(parsedData.tags !== undefined && { tags: parsedData.tags }),
          // Update definition object to keep it in sync
          ...(updatedDefinition && { definition: updatedDefinition }),
        };
        dispatch(setWorkflow(updatedWorkflow));
        dispatch(setYamlString(updatedWorkflow.yaml));
        return { type: 'detail/loadWorkflowThunk/fulfilled', payload: updatedWorkflow };
      };
    }) as any);
  });

  it('should update workflow successfully', async () => {
    const workflowUpdate: Partial<EsWorkflow> = {
      name: 'Updated Workflow Name',
      enabled: false,
    };

    mockServices.http.put.mockResolvedValue(undefined);

    const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

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

    const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

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

    const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

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

    const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

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

    const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

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

  describe('YAML synchronization for YAML-affecting updates', () => {
    it('should update YAML in place and reload from server when enabled field is updated', async () => {
      const initialYaml = 'name: Test Workflow\nenabled: true\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        enabled: false,
      };

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      // Verify loadWorkflowThunk was called to sync with server
      expect(mockLoadWorkflowThunk).toHaveBeenCalledWith({ id: 'test-workflow-1' });

      // Verify YAML string was updated (server preserves formatting)
      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toContain('enabled: false');
      expect(state.detail.yamlString).not.toContain('enabled: true');
      expect(state.detail.workflow?.enabled).toBe(false);
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });

    it('should update YAML in place when name field is updated', async () => {
      const initialYaml = 'name: Old Name\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        name: 'New Workflow Name',
      };

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      const state = store.getState();
      expect(state.detail.yamlString).toContain('name: New Workflow Name');
      expect(state.detail.workflow?.name).toBe('New Workflow Name');
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });

    it('should update YAML in place when description field is updated', async () => {
      const initialYaml = 'name: Test Workflow\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        description: 'New description',
      };

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toContain('description: New description');
      expect(state.detail.workflow?.description).toBe('New description');
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });

    it('should update YAML in place when tags field is updated', async () => {
      const initialYaml = 'name: Test Workflow\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        tags: ['tag1', 'tag2'],
      };

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toContain('tags:');
      expect(state.detail.workflow?.definition?.tags).toEqual(['tag1', 'tag2']);
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });

    it('should update YAML in place and reload from server when multiple YAML-affecting fields are updated', async () => {
      const initialYaml = 'name: Old Name\nenabled: true\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        enabled: false,
        name: 'Updated Name',
        description: 'Updated description',
      };

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      expect(mockLoadWorkflowThunk).toHaveBeenCalledWith({ id: 'test-workflow-1' });

      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toContain('enabled: false');
      expect(state.detail.yamlString).toContain('name: Updated Name');
      expect(state.detail.yamlString).toContain('description: Updated description');
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });
  });

  describe('Non-YAML updates', () => {
    it('should NOT update YAML or reload when YAML is directly updated', async () => {
      const initialYaml = 'name: Test Workflow\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        yaml: 'name: Direct YAML Update\nsteps: []',
      };

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      expect(mockLoadWorkflowThunk).not.toHaveBeenCalled();

      // Should just update the workflow in store, not update YAML string
      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toBe(initialYaml); // YAML string should remain unchanged
      expect(state.detail.workflow).toBeDefined();
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });

    it('should NOT update YAML or reload when update does not affect YAML', async () => {
      const initialYaml = 'name: Test Workflow\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      // Empty update or update with fields that don't affect YAML
      const workflowUpdate: Partial<EsWorkflow> = {};

      mockServices.http.put.mockResolvedValue(undefined);

      const result = await dispatchThunk(updateWorkflowThunk({ workflow: workflowUpdate }));

      expect(mockServices.http.put).toHaveBeenCalledWith('/api/workflows/test-workflow-1', {
        body: JSON.stringify(workflowUpdate),
      });

      expect(mockLoadWorkflowThunk).not.toHaveBeenCalled();

      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toBe(initialYaml); // YAML string should remain unchanged
      expect(result.type).toBe('detail/updateWorkflowThunk/fulfilled');
    });
  });

  describe('Regression prevention: YAML editor state synchronization', () => {
    it('should update YAML editor state when enabled toggle changes', async () => {
      const initialYaml = 'name: Test Workflow\nenabled: true\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        enabled: false,
      };

      mockServices.http.put.mockResolvedValue(undefined);

      await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

      // Verify YAML string was updated to reflect the new enabled value
      const state = store.getState() as RootState;
      expect(state.detail.yamlString).toContain('enabled: false');
      expect(state.detail.yamlString).not.toContain('enabled: true');
      expect(state.detail.workflow?.enabled).toBe(false);
    });

    it('should prevent saving old YAML after enabled toggle', async () => {
      const initialYaml = 'name: Test Workflow\nenabled: true\nsteps: []';
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        enabled: false,
      };

      mockServices.http.put.mockResolvedValue(undefined);

      await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

      // Verify the YAML string in editor matches the server state
      const state = store.getState() as RootState;
      const editorYaml = state.detail.yamlString;

      // The YAML should have the updated enabled value, not the old one
      expect(editorYaml).toContain('enabled: false');
      expect(editorYaml).not.toContain('enabled: true');

      // If we were to save now, it would save the correct YAML
      expect(state.detail.workflow?.enabled).toBe(false);
    });

    it('should preserve comments and formatting when updating enabled field', async () => {
      const initialYaml = `# This is a comment
name: Test Workflow
# Another comment
enabled: true

# Steps section
steps: []`;
      store.dispatch(setYamlString(initialYaml));

      const workflowUpdate: Partial<EsWorkflow> = {
        enabled: false,
      };

      mockServices.http.put.mockResolvedValue(undefined);

      await store.dispatch(updateWorkflowThunk({ workflow: workflowUpdate }));

      const state = store.getState() as RootState;
      const updatedYaml = state.detail.yamlString;

      // Verify comments and formatting are preserved
      expect(updatedYaml).toContain('# This is a comment');
      expect(updatedYaml).toContain('# Another comment');
      expect(updatedYaml).toContain('# Steps section');
      expect(updatedYaml).toContain('\n\n'); // Blank line should be preserved

      // Verify enabled value was updated
      expect(updatedYaml).toContain('enabled: false');
      expect(updatedYaml).not.toContain('enabled: true');
    });
  });
});
