/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetStepExecutionRoute } from './get_step_execution';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflowExecutions/{executionId}/steps/{id}', () => {
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
      registerGetStepExecutionRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions/{executionId}/steps/{id}'
      );
      routeHandler = getCall?.[1];
    });

    it('should return step execution successfully', async () => {
      const mockStepExecution = {
        id: 'step-execution-123',
        workflowRunId: 'execution-123',
        stepId: 'step1',
        stepName: 'First Step',
        stepType: 'action',
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
          data: {
            processed: 100,
            errors: [],
          },
        },
        error: null,
        spaceId: 'default',
      };

      workflowsApi.getStepExecution = jest.fn().mockResolvedValue(mockStepExecution);

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-123', id: 'step-execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getStepExecution).toHaveBeenCalledWith(
        { executionId: 'execution-123', id: 'step-execution-123' },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStepExecution });
    });

    it('should return 404 when step execution is not found', async () => {
      workflowsApi.getStepExecution = jest.fn().mockResolvedValue(null);

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-123', id: 'non-existent-step' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/steps/non-existent-step' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getStepExecution).toHaveBeenCalledWith(
        { executionId: 'execution-123', id: 'non-existent-step' },
        'default'
      );
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getStepExecution = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-123', id: 'step-execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
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
      const mockStepExecution = {
        id: 'step-execution-456',
        workflowRunId: 'execution-456',
        stepId: 'step2',
        stepName: 'Second Step',
        stepType: 'action',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 60000,
        inputs: {},
        outputs: {},
        error: null,
        spaceId: 'custom-space',
      };

      workflowsApi.getStepExecution = jest.fn().mockResolvedValue(mockStepExecution);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-456', id: 'step-execution-456' },
        headers: {},
        url: {
          pathname: '/s/custom-space/api/workflowExecutions/execution-456/steps/step-execution-456',
        },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getStepExecution).toHaveBeenCalledWith(
        { executionId: 'execution-456', id: 'step-execution-456' },
        'custom-space'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStepExecution });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getStepExecution = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-123', id: 'step-execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
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
      workflowsApi.getStepExecution = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-123', id: 'step-execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
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
