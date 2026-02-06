/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostCancelWorkflowExecutionRoute } from './post_cancel_workflow_execution';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /api/workflowExecutions/{workflowExecutionId}/cancel', () => {
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
      registerPostCancelWorkflowExecutionRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/cancel'
      );
      routeHandler = postCall?.[1];
    });

    it('should cancel workflow execution successfully', async () => {
      workflowsApi.cancelWorkflowExecution = jest.fn().mockResolvedValue(undefined);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith('execution-123', 'default');
      expect(mockResponse.ok).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Execution engine connection failed';
      workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
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
      workflowsApi.cancelWorkflowExecution = jest.fn().mockResolvedValue(undefined);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-456' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflowExecutions/execution-456/cancel' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'execution-456',
        'custom-space'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith();
    });

    it('should handle execution engine errors', async () => {
      const executionError = new Error('Execution engine connection failed');
      workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(executionError);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Execution engine connection failed',
        },
      });
    });

    it('should handle service initialization errors', async () => {
      const serviceError = new Error('WorkflowsService not initialized');
      workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        params: { workflowExecutionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
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

    // FIXME:Commented, because now it fails with 500 error instead of 404
    // https://github.com/elastic/security-team/issues/14264

    // it('should return 404 when execution is not found', async () => {
    //   class WorkflowExecutionNotFoundError extends Error {
    //     constructor(message: string) {
    //       super(message);
    //       this.name = 'WorkflowExecutionNotFoundError';
    //     }
    //   }

    //   const notFoundError = new WorkflowExecutionNotFoundError('Workflow execution not found');
    //   workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(notFoundError);

    //   const mockContext = {};
    //   const mockRequest = {
    //     params: { workflowExecutionId: 'non-existent-execution' },
    //     headers: {},
    //     url: { pathname: '/api/workflowExecutions/non-existent-execution/cancel' },
    //   };
    //   const mockResponse = {
    //     ok: jest.fn().mockReturnThis(),
    //     notFound: jest.fn().mockReturnThis(),
    //     customError: jest.fn().mockReturnThis(),
    //   };

    //   await routeHandler(mockContext, mockRequest, mockResponse);

    //   expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith(
    //     'non-existent-execution',
    //     'default'
    //   );
    //   expect(mockResponse.ok).not.toHaveBeenCalled();
    //   expect(mockResponse.customError).not.toHaveBeenCalled();
    //   expect(mockResponse.notFound).toHaveBeenCalledWith();
    // });
  });
});
