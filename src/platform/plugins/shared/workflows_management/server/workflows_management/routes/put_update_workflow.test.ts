/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPutUpdateWorkflowRoute } from './put_update_workflow';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('PUT /api/workflows/{id}', () => {
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
      registerPutUpdateWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.put
      const putCall = (mockRouter.put as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/{id}'
      );
      routeHandler = putCall?.[1];
    });

    it('should update workflow successfully', async () => {
      const mockUpdatedWorkflow = {
        id: 'workflow-123',
        lastUpdatedAt: new Date('2024-01-15T11:00:00Z'),
        lastUpdatedBy: 'user@example.com',
        enabled: true,
        valid: true,
        validationErrors: [],
      };

      workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          name: 'Updated Workflow',
          description: 'Updated description',
          enabled: true,
          tags: ['updated', 'workflow'],
          yaml: 'name: Updated Workflow\ndescription: Updated description\nenabled: true\ntags: [updated, workflow]',
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
        'workflow-123',
        mockRequest.body,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
    });

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(null);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        body: {
          name: 'Updated Workflow',
          enabled: true,
        },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
        'non-existent-workflow',
        mockRequest.body,
        'default',
        mockRequest
      );
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.updateWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          name: 'Updated Workflow',
        },
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
      const mockUpdatedWorkflow = {
        id: 'workflow-123',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'user@example.com',
        enabled: true,
        valid: true,
        validationErrors: [],
      };

      workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          name: 'Space-specific Updated Workflow',
          enabled: true,
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
        'workflow-123',
        mockRequest.body,
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.updateWorkflow = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          name: 'Updated Workflow',
        },
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

    it('should handle partial updates', async () => {
      const mockUpdatedWorkflow = {
        id: 'workflow-123',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'user@example.com',
        enabled: false,
        valid: true,
        validationErrors: [],
      };

      workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          enabled: false,
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
        'workflow-123',
        mockRequest.body,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
    });

    it('should handle update with validation errors', async () => {
      const mockUpdatedWorkflow = {
        id: 'workflow-123',
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'user@example.com',
        enabled: true,
        valid: false,
        validationErrors: ['Invalid step configuration', 'Missing required field'],
      };

      workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          yaml: 'name: Invalid Workflow\nsteps:\n  - id: step1\n    type: action',
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
        'workflow-123',
        mockRequest.body,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
    });
  });
});
