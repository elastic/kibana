/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerDeleteWorkflowsBulkRoute } from './delete_workflows_bulk';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('DELETE /api/workflows', () => {
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
      registerDeleteWorkflowsBulkRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.delete
      const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows'
      );
      routeHandler = deleteCall?.[1];
    });

    it('should delete multiple workflows successfully', async () => {
      const mockResult = {
        total: 3,
        deleted: 3,
        failures: [],
      };
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: {
          ids: ['workflow-123', 'workflow-456', 'workflow-789'],
        },
        headers: {},
        url: { pathname: '/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-123', 'workflow-456', 'workflow-789'],
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle empty ids array gracefully', async () => {
      const mockResult = {
        total: 3,
        deleted: 3,
        failures: [],
      };
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: {
          ids: [],
        },
        headers: {},
        url: { pathname: '/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith([], 'default', mockRequest);
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: {
          ids: ['workflow-123', 'workflow-456'],
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
      const mockResult = {
        total: 2,
        deleted: 2,
        failures: [],
      };
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(mockResult);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        body: {
          ids: ['workflow-123', 'workflow-456'],
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-123', 'workflow-456'],
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        body: {
          ids: ['workflow-123'],
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

    it('should handle service initialization errors', async () => {
      const serviceError = new Error('WorkflowsService not initialized');
      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        body: {
          ids: ['workflow-123', 'workflow-456'],
        },
        headers: {},
        url: { pathname: '/api/workflows' },
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
