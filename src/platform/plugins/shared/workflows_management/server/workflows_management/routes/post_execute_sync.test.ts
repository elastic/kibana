/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostExecuteSyncRoute } from './post_execute_sync';
import {
  createMockRequestHandlerContext,
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

describe('POST /api/workflows/execute_sync', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: any;
  let mockSpaces: any;
  let mockContext: ReturnType<typeof createMockRequestHandlerContext>;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    mockContext = createMockRequestHandlerContext();
    jest.clearAllMocks();
  });

  describe('handler logic', () => {
    let routeHandler: any;

    beforeEach(() => {
      registerPostExecuteSyncRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/execute_sync'
      );
      routeHandler = postCall?.[1];
    });

    it('should execute workflow synchronously and return output', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        spaceId: 'default',
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

      const mockOutput = { result: 'success', data: { key: 'value' } };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflowSync = jest.fn().mockResolvedValue(mockOutput);

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: {
            message: 'test message',
            count: 42,
          },
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(workflowsApi.runWorkflowSync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow-123',
          name: 'Test Workflow',
          enabled: true,
        }),
        'default',
        mockRequest.body.inputs,
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowId: 'workflow-123',
          output: mockOutput,
        },
      });
    });

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);
      const mockRequest = {
        body: {
          workflowId: 'non-existent-workflow',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: {
          message: 'Workflow [non-existent-workflow] not found',
        },
      });
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
      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Workflow [workflow-123] is not valid',
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
      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Workflow [workflow-123] is disabled. Enable it to run.',
        },
      });
    });

    it('should return 500 when workflow has no definition', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'No Definition Workflow',
        enabled: true,
        valid: true,
        definition: null,
        yaml: '',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Workflow [workflow-123] has no definition',
        },
      });
    });

    it('should handle execution errors gracefully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        spaceId: 'default',
        definition: {
          name: 'Test Workflow',
          steps: [],
        },
        yaml: 'name: Test Workflow',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflowSync = jest.fn().mockRejectedValue(new Error('Execution failed'));

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Execution failed',
        },
      });
    });

    it('should work with empty inputs', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        spaceId: 'default',
        definition: {
          name: 'Test Workflow',
          steps: [],
        },
        yaml: 'name: Test Workflow',
      };

      const mockOutput = { result: 'completed' };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflowSync = jest.fn().mockResolvedValue(mockOutput);

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.runWorkflowSync).toHaveBeenCalledWith(
        expect.anything(),
        'default',
        {},
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowId: 'workflow-123',
          output: mockOutput,
        },
      });
    });

    it('should work with different space contexts', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Space-specific Workflow',
        enabled: true,
        valid: true,
        spaceId: 'custom-space',
        definition: {
          name: 'Space-specific Workflow',
          steps: [],
        },
        yaml: 'name: Space-specific Workflow',
      };

      const mockOutput = { spaceResult: 'custom-space-output' };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflowSync = jest.fn().mockResolvedValue(mockOutput);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          inputs: { spaceParam: 'custom-value' },
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/execute_sync' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
      expect(workflowsApi.runWorkflowSync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow-123',
        }),
        'custom-space',
        mockRequest.body.inputs,
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowId: 'workflow-123',
          output: mockOutput,
        },
      });
    });
  });
});

