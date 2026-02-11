/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostCloneWorkflowRoute } from './post_clone_workflow';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /api/workflows/{id}/clone', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: any;
  let mockSpaces: any;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  describe('handler logic', () => {
    let routeHandler: any;

    beforeEach(() => {
      registerPostCloneWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/{id}/clone'
      );
      routeHandler = postCall?.[1];
    });

    it('should clone workflow successfully', async () => {
      const mockOriginalWorkflow = {
        id: 'workflow-123',
        name: 'Original Workflow',
        description: 'A workflow to be cloned',
        enabled: true,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        createdBy: 'user@example.com',
        lastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
        lastUpdatedBy: 'user@example.com',
        definition: {
          name: 'Original Workflow',
          description: 'A workflow to be cloned',
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              type: 'action',
              action: 'test-action',
            },
          ],
        },
        yaml: 'name: Original Workflow\ndescription: A workflow to be cloned\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
        valid: true,
      };

      const mockClonedWorkflow = {
        id: 'workflow-clone-456',
        name: 'Original Workflow Copy',
        description: 'A workflow to be cloned',
        enabled: true,
        createdAt: new Date('2024-01-15T11:00:00Z'),
        createdBy: 'user@example.com',
        lastUpdatedAt: new Date('2024-01-15T11:00:00Z'),
        lastUpdatedBy: 'user@example.com',
        definition: {
          name: 'Original Workflow Copy',
          description: 'A workflow to be cloned',
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              type: 'action',
              action: 'test-action',
            },
          ],
        },
        yaml: 'name: Original Workflow Copy\ndescription: A workflow to be cloned\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
        valid: true,
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockOriginalWorkflow);
      workflowsApi.cloneWorkflow = jest.fn().mockResolvedValue(mockClonedWorkflow);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/clone' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(workflowsApi.cloneWorkflow).toHaveBeenCalledWith(
        mockOriginalWorkflow,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockClonedWorkflow });
    });

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow/clone' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'YAML parsing failed';
      workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/clone' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: `Internal server error: Error: ${errorMessage}`,
        },
      });
    });

    it('should work with different space contexts', async () => {
      const mockOriginalWorkflow = {
        id: 'workflow-123',
        name: 'Space-specific Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Space-specific Workflow',
          steps: [],
        },
        yaml: 'name: Space-specific Workflow',
      };

      const mockClonedWorkflow = {
        id: 'workflow-clone-789',
        name: 'Space-specific Workflow Copy',
        enabled: true,
        valid: true,
        definition: {
          name: 'Space-specific Workflow Copy',
          steps: [],
        },
        yaml: 'name: Space-specific Workflow Copy',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockOriginalWorkflow);
      workflowsApi.cloneWorkflow = jest.fn().mockResolvedValue(mockClonedWorkflow);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-123/clone' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
      expect(workflowsApi.cloneWorkflow).toHaveBeenCalledWith(
        mockOriginalWorkflow,
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockClonedWorkflow });
    });

    it('should handle clone operation errors', async () => {
      const mockOriginalWorkflow = {
        id: 'workflow-123',
        name: 'Original Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Original Workflow',
          steps: [],
        },
        yaml: 'name: Original Workflow',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockOriginalWorkflow);
      workflowsApi.cloneWorkflow = jest.fn().mockRejectedValue(new Error('Clone operation failed'));

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/clone' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(workflowsApi.cloneWorkflow).toHaveBeenCalledWith(
        mockOriginalWorkflow,
        'default',
        mockRequest
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Clone operation failed',
        },
      });
    });
  });
});
