/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowExecutionByIdRoute } from './get_workflow_execution_by_id';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflowExecutions/{workflowExecutionId}', () => {
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
      registerGetWorkflowExecutionByIdRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}'
      );
      routeHandler = getCall?.[1];
    });

    it('should return workflow execution successfully', async () => {
      const mockExecution = {
        id: 'execution-123',
        workflowId: 'workflow-123',
        status: 'completed',
        executionType: 'manual',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:05:00Z'),
        duration: 300000,
        steps: [
          {
            id: 'step1',
            name: 'First Step',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:02:00Z'),
            duration: 120000,
            inputs: {
              param1: 'value1',
              param2: 'value2',
            },
            outputs: {
              result: 'success',
            },
          },
          {
            id: 'step2',
            name: 'Second Step',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:02:00Z'),
            completedAt: new Date('2024-01-15T10:05:00Z'),
            duration: 180000,
            inputs: {
              param3: 'value3',
            },
            outputs: {
              result: 'completed',
            },
          },
        ],
      };

      workflowsApi.getWorkflowExecution = jest.fn().mockResolvedValue(mockExecution);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith('execution-123', 'default');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecution });
    });

    it('should return 404 when execution is not found', async () => {
      workflowsApi.getWorkflowExecution = jest.fn().mockResolvedValue(null);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'non-existent-execution' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/non-existent-execution' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith(
        'non-existent-execution',
        'default'
      );
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflowExecution = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123' },
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
      const mockExecution = {
        id: 'execution-456',
        workflowId: 'workflow-123',
        status: 'completed',
        executionType: 'manual',
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 300000,
        steps: [],
      };

      workflowsApi.getWorkflowExecution = jest.fn().mockResolvedValue(mockExecution);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-456' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflowExecutions/execution-456' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith(
        'execution-456',
        'custom-space'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecution });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflowExecution = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123' },
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
      workflowsApi.getWorkflowExecution = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123' },
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
