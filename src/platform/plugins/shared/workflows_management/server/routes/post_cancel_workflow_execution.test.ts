/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './lib/test_utils';
import { registerPostCancelWorkflowExecutionRoute } from './post_cancel_workflow_execution';
import { API_VERSIONS, WORKFLOWS_EXECUTIONS_API_PATHS } from '../../common/api/constants';
import type { WorkflowsManagementApi } from '../service/workflows_management_api';

jest.mock('./lib/with_license_check', () => ({
  withLicenseCheck: (handler: unknown) => handler,
}));

describe('POST /api/workflows-executions/{executionId}/cancel', () => {
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
      const route = mockRouter.versioned.getRoute('post', WORKFLOWS_EXECUTIONS_API_PATHS.CANCEL);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should cancel workflow execution successfully', async () => {
      workflowsApi.cancelWorkflowExecution = jest.fn().mockResolvedValue(undefined);

      const mockContext = {};
      const mockRequest = {
        params: { executionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflows-executions/execution-123/cancel' },
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
        params: { executionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflows-executions/execution-123/cancel' },
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
        params: { executionId: 'execution-456' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows-executions/execution-456/cancel' },
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
        params: { executionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflows-executions/execution-123/cancel' },
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
        params: { executionId: 'execution-123' },
        headers: {},
        url: { pathname: '/api/workflows-executions/execution-123/cancel' },
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
