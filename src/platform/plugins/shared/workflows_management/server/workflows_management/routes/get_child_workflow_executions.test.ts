/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetChildWorkflowExecutionsRoute } from './get_child_workflow_executions';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflowExecutions/{workflowExecutionId}/childExecutions', () => {
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
      registerGetChildWorkflowExecutionsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call: any) =>
          call[0].path === '/api/workflowExecutions/{workflowExecutionId}/childExecutions'
      );
      routeHandler = getCall?.[1];
    });

    it('should return child executions successfully', async () => {
      const mockChildren = [
        {
          parentStepExecutionId: 'step-1',
          workflowId: 'child-wf-1',
          workflowName: 'Child Workflow',
          executionId: 'child-exec-1',
          status: 'completed',
          stepExecutions: [],
        },
      ];

      workflowsApi.getChildWorkflowExecutions = jest.fn().mockResolvedValue(mockChildren);

      const mockRequest = {
        params: { workflowExecutionId: 'parent-exec-1' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/parent-exec-1/childExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.getChildWorkflowExecutions).toHaveBeenCalledWith(
        'parent-exec-1',
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockChildren });
    });

    it('should return empty array when no children exist', async () => {
      workflowsApi.getChildWorkflowExecutions = jest.fn().mockResolvedValue([]);

      const mockRequest = {
        params: { workflowExecutionId: 'parent-exec-1' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/parent-exec-1/childExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: [] });
    });

    it('should return 404 when parent execution is not found', async () => {
      const notFoundError = new Error('Not found');
      Object.assign(notFoundError, { meta: { statusCode: 404 } });
      workflowsApi.getChildWorkflowExecutions = jest.fn().mockRejectedValue(notFoundError);

      const mockRequest = {
        params: { workflowExecutionId: 'parent-exec-1' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/parent-exec-1/childExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      workflowsApi.getChildWorkflowExecutions = jest
        .fn()
        .mockRejectedValue(new Error('ES connection failed'));

      const mockRequest = {
        params: { workflowExecutionId: 'parent-exec-1' },
        headers: {},
        url: { pathname: '/api/workflowExecutions/parent-exec-1/childExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: ES connection failed',
        },
      });
    });

    it('should use the correct space context', async () => {
      workflowsApi.getChildWorkflowExecutions = jest.fn().mockResolvedValue([]);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockRequest = {
        params: { workflowExecutionId: 'parent-exec-1' },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflowExecutions/parent-exec-1/childExecutions' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.getChildWorkflowExecutions).toHaveBeenCalledWith(
        'parent-exec-1',
        'custom-space'
      );
    });
  });
});
