/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerDeleteWorkflowByIdRoute } from './delete_workflow_by_id';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('DELETE /api/workflows/{id}', () => {
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
      registerDeleteWorkflowByIdRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.delete
      const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/{id}'
      );
      routeHandler = deleteCall?.[1];
    });

    it('should delete workflow successfully', async () => {
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-123'],
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

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
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { id: 'workflow-123' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-123'],
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith();
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(esError);

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

    it('should handle workflow not found gracefully', async () => {
      // The deleteWorkflows method handles not found workflows gracefully
      // by ignoring 404 errors, so it should not throw
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);

      const mockContext = {};
      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
        ['non-existent-workflow'],
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith();
    });

    it('should handle service initialization errors', async () => {
      const serviceError = new Error('WorkflowsService not initialized');
      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(serviceError);

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
          message: 'Internal server error: Error: WorkflowsService not initialized',
        },
      });
    });
  });
});
