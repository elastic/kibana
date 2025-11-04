/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostRunWorkflowRoute } from './post_run_workflow';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

describe('POST /api/workflows/{id}/run', () => {
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
      registerPostRunWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/{id}/run'
      );
      routeHandler = postCall?.[1];
    });

    it('should run workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Test Workflow',
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              type: 'action',
              action: 'test-action',
            },
          ],
        },
        yaml: 'name: Test Workflow\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
      };

      const mockExecutionId = 'execution-123';

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {
            param1: 'value1',
            param2: 'value2',
          },
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(workflowsApi.runWorkflow).toHaveBeenCalledWith(
        {
          id: 'workflow-123',
          name: 'Test Workflow',
          enabled: true,
          definition: mockWorkflow.definition,
          yaml: mockWorkflow.yaml,
        },
        'default',
        mockRequest.body.inputs,
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should return 400 when workflow is not valid', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Invalid Workflow',
        enabled: true,
        valid: false,
        definition: null,
        yaml: '',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Workflow is not valid.',
        },
      });
    });

    it('should return 400 when workflow is disabled', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Disabled Workflow',
        enabled: false,
        valid: true,
        definition: {
          name: 'Disabled Workflow',
          steps: [],
        },
        yaml: 'name: Disabled Workflow',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Workflow is disabled. Enable it to run it.',
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Workflow execution engine failed';
      workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
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
      const mockWorkflow = {
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

      const mockExecutionId = 'execution-456';

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {
            spaceParam: 'custom-value',
          },
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
      expect(workflowsApi.runWorkflow).toHaveBeenCalledWith(
        {
          id: 'workflow-123',
          name: 'Space-specific Workflow',
          enabled: true,
          definition: mockWorkflow.definition,
          yaml: mockWorkflow.yaml,
        },
        'custom-space',
        mockRequest.body.inputs,
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should handle execution engine errors', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Test Workflow',
          steps: [],
        },
        yaml: 'name: Test Workflow',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockRejectedValue(new Error('Execution engine error'));

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Execution engine error',
        },
      });
    });
  });
});
