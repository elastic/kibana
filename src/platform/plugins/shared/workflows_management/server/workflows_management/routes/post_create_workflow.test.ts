/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostCreateWorkflowRoute } from './post_create_workflow';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

describe('POST /api/workflows', () => {
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
      registerPostCreateWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows'
      );
      routeHandler = postCall?.[1];
    });

    it('should create workflow successfully', async () => {
      const mockCreatedWorkflow = {
        id: 'new-workflow-123',
        name: 'New Test Workflow',
        description: 'A newly created test workflow',
        enabled: true,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        createdBy: 'user@example.com',
        lastUpdatedAt: new Date('2024-01-15T10:00:00Z'),
        lastUpdatedBy: 'user@example.com',
        definition: {
          name: 'New Test Workflow',
          description: 'A newly created test workflow',
          triggers: [],
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              type: 'action',
              action: 'test-action',
            },
          ],
        },
        yaml: 'name: New Test Workflow\ndescription: A newly created test workflow\ntriggers: []\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
        valid: true,
      };

      workflowsApi.createWorkflow = jest.fn().mockResolvedValue(mockCreatedWorkflow);

      const mockContext = {};
      const mockRequest = {
        body: {
          yaml: 'name: New Test Workflow\ndescription: A newly created test workflow\ntriggers: []\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
        },
        headers: {},
        url: { pathname: '/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
        mockRequest.body,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockCreatedWorkflow });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.createWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: {
          yaml: 'name: Test Workflow',
        },
        headers: {},
        url: { pathname: '/api/workflows' },
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
      const mockCreatedWorkflow = {
        id: 'new-workflow-123',
        name: 'Space-specific Workflow',
        description: 'Workflow created in custom space',
        enabled: true,
        createdAt: new Date(),
        createdBy: 'user@example.com',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'user@example.com',
        definition: null,
        yaml: 'name: Space-specific Workflow',
        valid: true,
      };

      workflowsApi.createWorkflow = jest.fn().mockResolvedValue(mockCreatedWorkflow);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        body: {
          yaml: 'name: Space-specific Workflow',
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
        mockRequest.body,
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockCreatedWorkflow });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.createWorkflow = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        body: {
          yaml: 'name: Test Workflow',
        },
        headers: {},
        url: { pathname: '/api/workflows' },
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

    it('should handle YAML parsing errors', async () => {
      const yamlError = new Error('Invalid workflow yaml: YAML parsing failed');
      workflowsApi.createWorkflow = jest.fn().mockRejectedValue(yamlError);

      const mockContext = {};
      const mockRequest = {
        body: {
          yaml: 'invalid: yaml: content: [',
        },
        headers: {},
        url: { pathname: '/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
        mockRequest.body,
        'default',
        mockRequest
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Invalid workflow yaml: YAML parsing failed',
        },
      });
    });
  });
});
