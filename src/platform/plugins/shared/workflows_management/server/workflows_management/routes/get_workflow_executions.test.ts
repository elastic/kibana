/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowExecutionsRoute } from './get_workflow_executions';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflowExecutions', () => {
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
      registerGetWorkflowExecutionsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions'
      );
      routeHandler = getCall?.[1];
    });

    it('should return workflow executions successfully', async () => {
      const mockExecutions = {
        page: 1,
        size: 10,
        total: 2,
        results: [
          {
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
              },
            ],
          },
          {
            id: 'execution-456',
            workflowId: 'workflow-123',
            status: 'failed',
            executionType: 'manual',
            createdAt: new Date('2024-01-14T09:00:00Z'),
            startedAt: new Date('2024-01-14T09:00:00Z'),
            completedAt: new Date('2024-01-14T09:03:00Z'),
            duration: 180000,
            steps: [
              {
                id: 'step1',
                name: 'First Step',
                status: 'failed',
                startedAt: new Date('2024-01-14T09:00:00Z'),
                completedAt: new Date('2024-01-14T09:03:00Z'),
                duration: 180000,
              },
            ],
          },
        ],
      };

      workflowsApi.getWorkflowExecutions = jest.fn().mockResolvedValue(mockExecutions);

      const mockContext = {};
      const mockRequest = {
        query: {
          workflowId: 'workflow-123',
          statuses: ['completed', 'failed'],
          page: 1,
          size: 10,
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecutions).toHaveBeenCalledWith(
        {
          workflowId: 'workflow-123',
          statuses: ['completed', 'failed'],
          page: 1,
          size: 10,
        },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecutions });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflowExecutions = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        query: {
          workflowId: 'workflow-123',
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions' },
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
      const mockExecutions = {
        page: 1,
        size: 10,
        total: 1,
        results: [
          {
            id: 'execution-789',
            workflowId: 'workflow-123',
            status: 'completed',
            executionType: 'manual',
            createdAt: new Date(),
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 300000,
            steps: [],
          },
        ],
      };

      workflowsApi.getWorkflowExecutions = jest.fn().mockResolvedValue(mockExecutions);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        query: {
          workflowId: 'workflow-123',
          statuses: ['completed'],
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflowExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecutions).toHaveBeenCalledWith(
        {
          workflowId: 'workflow-123',
          statuses: ['completed'],
          page: undefined,
          size: undefined,
        },
        'custom-space'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecutions });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflowExecutions = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        query: {
          workflowId: 'workflow-123',
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions' },
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

    it('should handle pagination parameters', async () => {
      const mockExecutions = {
        page: 2,
        size: 5,
        total: 15,
        results: [],
      };

      workflowsApi.getWorkflowExecutions = jest.fn().mockResolvedValue(mockExecutions);

      const mockContext = {};
      const mockRequest = {
        query: {
          workflowId: 'workflow-123',
          page: 2,
          size: 5,
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowExecutions).toHaveBeenCalledWith(
        {
          workflowId: 'workflow-123',
          page: 2,
          size: 5,
        },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecutions });
    });

    it('should handle service initialization errors', async () => {
      const serviceError = new Error('WorkflowsService not initialized');
      workflowsApi.getWorkflowExecutions = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        query: {
          workflowId: 'workflow-123',
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions' },
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
