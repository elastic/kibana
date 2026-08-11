/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows/types/latest';
import { createMockWorkflowApi } from '@kbn/workflows-ui/mocks';

import { loadWorkflowThunk } from './load_workflow_thunk';
import { saveYamlThunk } from './save_yaml_thunk';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { setWorkflow, setYamlString } from '../slice';

// Need to mock the loading states to avoid import issues with other mocks
jest.mock('../utils/loading_states', () => ({
  addLoadingStateReducers: jest.fn(),
  initialLoadingState: { isSavingYaml: false },
}));
// Mock the loadWorkflowThunk
jest.mock('./load_workflow_thunk');
const mockLoadWorkflowThunk = loadWorkflowThunk as jest.MockedFunction<typeof loadWorkflowThunk>;

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => mockWorkflowApi),
}));

// Mock the query client
jest.mock('../../../../../shared/lib/query_client', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));
const { queryClient } = jest.requireMock('../../../../../shared/lib/query_client');

// Mock AI integration side-effects — the thunk resolves pending diff decorations,
// carries the create-time conversation onto the saved workflow's session tag,
// and requests the sidebar to re-open on the destination if it was open at
// save time (since navigateToApp remounts the app).
jest.mock('../../../../../features/ai_integration', () => ({
  acceptAllActiveProposals: jest.fn(),
  carryConversationToWorkflow: jest.fn(),
  isSidebarOpen: jest.fn().mockReturnValue(false),
  requestSidebarRestore: jest.fn(),
}));

type AiIntegrationModule = typeof import('../../../../../features/ai_integration');
const {
  acceptAllActiveProposals: mockAcceptAllActiveProposals,
  carryConversationToWorkflow: mockCarryConversationToWorkflow,
  isSidebarOpen: mockIsSidebarOpen,
  requestSidebarRestore: mockRequestSidebarRestore,
} = jest.requireMock('../../../../../features/ai_integration') as {
  acceptAllActiveProposals: jest.MockedFunction<AiIntegrationModule['acceptAllActiveProposals']>;
  carryConversationToWorkflow: jest.MockedFunction<
    AiIntegrationModule['carryConversationToWorkflow']
  >;
  isSidebarOpen: jest.MockedFunction<AiIntegrationModule['isSidebarOpen']>;
  requestSidebarRestore: jest.MockedFunction<AiIntegrationModule['requestSidebarRestore']>;
};

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
      store.dispatch(setYamlString('name: Updated Workflow\nsteps: []'));
    });

    it('should save updated workflow successfully', async () => {
      mockWorkflowApi.updateWorkflow.mockResolvedValue(undefined as any);
      mockLoadWorkflowThunk.mockImplementation(((arg: any) => {
        return async (dispatch: any) => {
          dispatch(setWorkflow(mockWorkflow));
          dispatch(setYamlString(mockWorkflow.yaml));
        };
      }) as any);

      const result = await store.dispatch(saveYamlThunk());

      expect(mockWorkflowApi.updateWorkflow).toHaveBeenCalledWith('test-workflow-1', {
        yaml: 'name: Updated Workflow\nsteps: []',
      });
      expect(mockLoadWorkflowThunk).toHaveBeenCalled();
      expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalled();
      expect(result.type).toBe('detail/saveYamlThunk/fulfilled');
    });

    it('should handle HTTP error when updating', async () => {
      const error = {
        body: { message: 'Update failed' },
        message: 'Bad Request',
      };

      mockWorkflowApi.updateWorkflow.mockRejectedValue(error);

      const result = await store.dispatch(saveYamlThunk());

      expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          title: expect.stringContaining('Failed to save workflow'),
        })
      );
      expect(result.type).toBe('detail/saveYamlThunk/rejected');
      expect(result.payload).toBe('Update failed');
    });
  });

  describe('when creating new workflow', () => {
    beforeEach(() => {
      // Set up initial state with yaml but no workflow
      store.dispatch(setYamlString('name: New Workflow\nsteps: []'));
    });

    it('should create new workflow successfully', async () => {
      mockWorkflowApi.createWorkflow.mockResolvedValue(mockWorkflow);

      const result = await store.dispatch(saveYamlThunk());

      expect(mockWorkflowApi.createWorkflow).toHaveBeenCalledWith({
        yaml: 'name: New Workflow\nsteps: []',
      });
      // On successful create, hand off the /workflows/create chat conversation
      // onto the newly-saved workflow so its detail view opens with history.
      expect(mockCarryConversationToWorkflow).toHaveBeenCalledWith('test-workflow-1');
      // Regression guard: the carry must run BEFORE navigateToApp. Dispatching
      // setWorkflow re-fires the agent-builder integration effect, and any
      // clear of the module-level create attachmentId there would race the
      // carry call and no-op the handoff.
      const carryOrder = mockCarryConversationToWorkflow.mock.invocationCallOrder[0];
      const navOrder = mockServices.application.navigateToApp.mock.invocationCallOrder[0];
      expect(carryOrder).toBeLessThan(navOrder);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workflows'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['workflows', undefined],
      });
      expect(mockServices.application.navigateToApp).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          path: 'test-workflow-1',
        })
      );
      expect(mockServices.notifications.toasts.addSuccess).toHaveBeenCalled();
      expect(result.type).toBe('detail/saveYamlThunk/fulfilled');
    });

    it('should handle HTTP error when creating', async () => {
      const error = {
        body: { message: 'Creation failed' },
        message: 'Bad Request',
      };

      mockWorkflowApi.createWorkflow.mockRejectedValue(error);

      const result = await store.dispatch(saveYamlThunk());

      expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          title: expect.stringContaining('Failed to save workflow'),
        })
      );
      expect(result.type).toBe('detail/saveYamlThunk/rejected');
      expect(result.payload).toBe('Creation failed');
    });
  });

  describe('sidebar restore-on-mount request', () => {
    it('requests sidebar restore when the sidebar was open at save time', async () => {
      mockIsSidebarOpen.mockReturnValue(true);
      store.dispatch(setYamlString('name: With Open Sidebar\nsteps: []'));
      mockWorkflowApi.createWorkflow.mockResolvedValue(mockWorkflow);

      await store.dispatch(saveYamlThunk());

      expect(mockRequestSidebarRestore).toHaveBeenCalledWith('test-workflow-1');
    });

    it('does NOT request restore when the sidebar was closed at save time', async () => {
      mockIsSidebarOpen.mockReturnValue(false);
      store.dispatch(setYamlString('name: Closed Sidebar\nsteps: []'));
      mockWorkflowApi.createWorkflow.mockResolvedValue(mockWorkflow);

      await store.dispatch(saveYamlThunk());

      expect(mockRequestSidebarRestore).not.toHaveBeenCalled();
    });

    it('does NOT request restore on plain updates (existing workflow)', async () => {
      // Updates don't navigate — nothing remounts, so there's nothing to restore.
      mockIsSidebarOpen.mockReturnValue(true);
      store.dispatch(setWorkflow(mockWorkflow));
      store.dispatch(setYamlString('name: Updated Workflow\nsteps: []'));
      mockWorkflowApi.updateWorkflow.mockResolvedValue(undefined as any);
      mockLoadWorkflowThunk.mockImplementation(((_arg: any) => async () => {}) as any);

      await store.dispatch(saveYamlThunk());

      expect(mockRequestSidebarRestore).not.toHaveBeenCalled();
    });
  });

  describe('AI proposal handling', () => {
    it('uses the post-accept YAML returned by acceptAllActiveProposals to persist', async () => {
      // Regression: reading yamlString from Redux immediately after accepting
      // can race with the Monaco→Redux sync. The thunk must sync the returned
      // post-accept content into Redux before persisting.
      mockAcceptAllActiveProposals.mockReturnValue('name: Accepted YAML\nsteps: []');
      store.dispatch(setYamlString('name: PRE-accept — stale\nsteps: []'));
      mockWorkflowApi.createWorkflow.mockResolvedValue(mockWorkflow);

      await store.dispatch(saveYamlThunk());

      expect(mockWorkflowApi.createWorkflow).toHaveBeenCalledWith({
        yaml: 'name: Accepted YAML\nsteps: []',
      });
    });

    it('falls back to Redux yamlString when there is nothing to accept', async () => {
      mockAcceptAllActiveProposals.mockReturnValue(undefined);
      store.dispatch(setYamlString('name: From Redux\nsteps: []'));
      mockWorkflowApi.createWorkflow.mockResolvedValue(mockWorkflow);

      await store.dispatch(saveYamlThunk());

      expect(mockWorkflowApi.createWorkflow).toHaveBeenCalledWith({
        yaml: 'name: From Redux\nsteps: []',
      });
    });

    it('accepts pending AI diff decorations before persisting on update', async () => {
      store.dispatch(setWorkflow(mockWorkflow));
      store.dispatch(setYamlString('name: With Pending Diff\nsteps: []'));
      mockWorkflowApi.updateWorkflow.mockResolvedValue(undefined as any);
      mockLoadWorkflowThunk.mockImplementation(((_arg: any) => {
        return async () => {};
      }) as any);

      await store.dispatch(saveYamlThunk());

      expect(mockAcceptAllActiveProposals).toHaveBeenCalled();
    });

    it('accepts pending AI diff decorations before creating a new workflow', async () => {
      store.dispatch(setYamlString('name: Brand New\nsteps: []'));
      mockWorkflowApi.createWorkflow.mockResolvedValue(mockWorkflow);

      await store.dispatch(saveYamlThunk());

      expect(mockAcceptAllActiveProposals).toHaveBeenCalled();
    });
  });

  it('should reject when no YAML content to save', async () => {
    // Set up state with empty yaml
    store.dispatch(setYamlString(''));

    const result = await store.dispatch(saveYamlThunk());

    expect(result.type).toBe('detail/saveYamlThunk/rejected');
    expect(result.payload).toBe('No YAML content to save');
  });

  it('should handle error without message', async () => {
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setYamlString('name: Test Workflow\nsteps: []'));

    const error = {};
    mockWorkflowApi.updateWorkflow.mockRejectedValue(error);

    const result = await store.dispatch(saveYamlThunk());

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        title: expect.stringContaining('Failed to save workflow'),
      })
    );
    expect(result.type).toBe('detail/saveYamlThunk/rejected');
    expect(result.payload).toBe('Failed to save workflow');
  });
});
