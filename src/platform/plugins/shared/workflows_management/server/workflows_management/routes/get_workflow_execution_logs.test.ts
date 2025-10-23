/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowExecutionLogsRoute } from './get_workflow_execution_logs';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

describe('GET /api/workflowExecutions/{workflowExecutionId}/logs', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: any;
  let mockSpaces: any;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  describe('route definition', () => {
    it('should define the workflow execution logs route with correct configuration', () => {
      registerGetWorkflowExecutionLogsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });

      const getLogsCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/logs'
      );

      expect(getLogsCall).toBeDefined();
      expect(getLogsCall[0]).toMatchObject({
        path: '/api/workflowExecutions/{workflowExecutionId}/logs',
        options: {
          tags: ['api', 'workflows'],
        },
        security: {
          authz: {
            requiredPrivileges: ['all'],
          },
        },
      });
      expect(getLogsCall[0].validate).toBeDefined();
      expect(getLogsCall[0].validate.params).toBeDefined();
      expect(getLogsCall[0].validate.query).toBeDefined();
      expect(getLogsCall[1]).toEqual(expect.any(Function));
    });
  });

  describe('handler logic', () => {
    let routeHandler: any;

    beforeEach(() => {
      registerGetWorkflowExecutionLogsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/logs'
      );
      routeHandler = getCall?.[1];
    });

    it('should return workflow execution logs successfully', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            timestamp: '2024-01-15T10:00:00Z',
            level: 'info',
            message: 'Workflow execution started',
            stepId: 'step1',
            stepName: 'First Step',
            connectorType: 'action',
            duration: 1000,
            additionalData: {
              workflowId: 'workflow-123',
              workflowName: 'Test Workflow',
              executionId: 'execution-123',
              event: {
                action: 'workflow_started',
                duration: 1000,
              },
              tags: ['workflow', 'execution'],
              error: null,
            },
          },
          {
            id: 'log-2',
            timestamp: '2024-01-15T10:00:05Z',
            level: 'info',
            message: 'Step completed successfully',
            stepId: 'step1',
            stepName: 'First Step',
            connectorType: 'action',
            duration: 5000,
            additionalData: {
              workflowId: 'workflow-123',
              workflowName: 'Test Workflow',
              executionId: 'execution-123',
              event: {
                action: 'step_completed',
                duration: 5000,
              },
              tags: ['workflow', 'step'],
              error: null,
            },
          },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      };

      workflowsApi.getWorkflowExecutionLogs = jest.fn().mockResolvedValue(mockLogs);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        query: {
          limit: 100,
          offset: 0,
          sortField: 'timestamp',
          sortOrder: 'desc',
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/logs' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecutionLogs).toHaveBeenCalledWith(
        {
          executionId: 'execution-123',
          limit: 100,
          offset: 0,
          sortField: 'timestamp',
          sortOrder: 'desc',
          stepExecutionId: undefined,
        },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockLogs });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflowExecutionLogs = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        query: {},
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/logs' },
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
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      workflowsApi.getWorkflowExecutionLogs = jest.fn().mockResolvedValue(mockLogs);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-456' },
        query: {},
        headers: {},
        url: { pathname: '/s/custom-space/api/workflowExecutions/execution-456/logs' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecutionLogs).toHaveBeenCalledWith(
        {
          executionId: 'execution-456',
        },
        'custom-space'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockLogs });
    });

    it('should handle pagination parameters', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            timestamp: '2024-01-15T10:00:00Z',
            level: 'info',
            message: 'Workflow execution started',
            stepId: 'step1',
            stepName: 'First Step',
            connectorType: 'action',
            duration: 1000,
            additionalData: {
              workflowId: 'workflow-123',
              workflowName: 'Test Workflow',
              executionId: 'execution-123',
              event: {
                action: 'workflow_started',
                duration: 1000,
              },
              tags: ['workflow', 'execution'],
              error: null,
            },
          },
        ],
        total: 1,
        limit: 10,
        offset: 20,
      };

      workflowsApi.getWorkflowExecutionLogs = jest.fn().mockResolvedValue(mockLogs);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        query: {
          limit: 10,
          offset: 20,
          sortField: 'level',
          sortOrder: 'asc',
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/logs' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecutionLogs).toHaveBeenCalledWith(
        {
          executionId: 'execution-123',
          limit: 10,
          offset: 20,
          sortField: 'level',
          sortOrder: 'asc',
        },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockLogs });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflowExecutionLogs = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        query: {},
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/logs' },
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
      workflowsApi.getWorkflowExecutionLogs = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        query: {},
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/logs' },
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
