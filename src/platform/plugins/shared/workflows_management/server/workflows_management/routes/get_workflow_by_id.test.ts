/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowByIdRoute } from './get_workflow_by_id';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflows/{id}', () => {
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
      registerGetWorkflowByIdRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/{id}'
      );
      routeHandler = getCall?.[1];
    });

    it('should return workflow details successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        description: 'A test workflow for demonstration',
        enabled: true,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        createdBy: 'user@example.com',
        lastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
        lastUpdatedBy: 'user@example.com',
        definition: {
          name: 'Test Workflow',
          description: 'A test workflow for demonstration',
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              type: 'action',
              action: 'test-action',
            },
          ],
        },
        yaml: 'name: Test Workflow\ndescription: A test workflow for demonstration\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
        valid: true,
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockWorkflow });
    });

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: {
          message: 'Workflow not found',
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
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
        name: 'Test Workflow',
        enabled: true,
        createdAt: new Date(),
        createdBy: 'user@example.com',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'user@example.com',
        definition: null,
        yaml: '',
        valid: true,
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockWorkflow });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflow = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: ConnectionError: Connection refused',
        },
      });
    });
  });
});
