/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowStepExecutionsRoute } from './get_workflow_step_executions';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflowExecutions/:workflowId/steps', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: ReturnType<typeof createMockRouterInstance>;
  let mockSpaces: ReturnType<typeof createSpacesMock>;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  describe('handler logic', () => {
    let routeHandler: (context: unknown, request: unknown, response: unknown) => Promise<void>;

    beforeEach(() => {
      registerGetWorkflowStepExecutionsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call: { path: string }[]) => call[0].path === '/api/workflowExecutions/{workflowId}/steps'
      );
      routeHandler = getCall?.[1];
    });

    it('should return step executions successfully', async () => {
      const mockStepExecutions = {
        results: [
          {
            id: 'step-exec-1',
            stepId: 'hello_world_step',
            stepType: 'http',
            workflowRunId: 'run-1',
            workflowId: 'workflow-123',
            status: 'completed',
            startedAt: '2024-01-15T10:00:00Z',
            globalExecutionIndex: 0,
            stepExecutionIndex: 0,
          },
        ],
        total: 1,
        page: 1,
        size: 100,
      };

      (workflowsApi.searchStepExecutions as jest.Mock).mockResolvedValue(mockStepExecutions);

      const mockRequest = {
        params: { workflowId: 'workflow-123' },
        query: {},
        headers: {},
        url: { pathname: '/api/workflowExecutions/workflow-123/steps' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.searchStepExecutions).toHaveBeenCalledWith(
        {
          workflowId: 'workflow-123',
          stepId: undefined,
          includeInput: false,
          includeOutput: false,
          page: undefined,
          size: undefined,
        },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStepExecutions });
    });

    it('should pass optional query params to the API', async () => {
      const mockStepExecutions = { results: [], total: 0, page: 2, size: 50 };
      (workflowsApi.searchStepExecutions as jest.Mock).mockResolvedValue(mockStepExecutions);

      const mockRequest = {
        params: { workflowId: 'workflow-123' },
        query: {
          stepId: 'my_step',
          includeInput: true,
          includeOutput: false,
          page: 2,
          size: 50,
        },
        headers: {},
        url: { pathname: '/api/workflowExecutions/workflow-123/steps' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.searchStepExecutions).toHaveBeenCalledWith(
        {
          workflowId: 'workflow-123',
          stepId: 'my_step',
          includeInput: true,
          includeOutput: false,
          page: 2,
          size: 50,
        },
        'default'
      );
    });

    it('should handle API errors gracefully', async () => {
      (workflowsApi.searchStepExecutions as jest.Mock).mockRejectedValue(
        new Error('Elasticsearch connection failed')
      );

      const mockRequest = {
        params: { workflowId: 'workflow-123' },
        query: {},
        headers: {},
        url: { pathname: '/api/workflowExecutions/workflow-123/steps' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Elasticsearch connection failed',
        },
      });
    });
  });
});
