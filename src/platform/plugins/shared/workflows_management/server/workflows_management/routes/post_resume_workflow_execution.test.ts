/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
} from '@kbn/workflows/common/errors';
import { registerPostResumeWorkflowExecutionRoute } from './post_resume_workflow_execution';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /api/workflowExecutions/{executionId}/resume', () => {
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
      registerPostResumeWorkflowExecutionRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflowExecutions/{executionId}/resume'
      );
      routeHandler = postCall?.[1];
    });

    it('should schedule resume and return 200 with success body', async () => {
      workflowsApi.resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);

      const mockRequest = {
        params: { executionId: 'execution-123' },
        body: { input: { approved: true } },
        headers: {},
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        'execution-123',
        'default',
        { approved: true },
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          executionId: 'execution-123',
          message: 'Workflow resume scheduled',
        },
      });
    });

    it('should return 404 when execution is not found', async () => {
      workflowsApi.resumeWorkflowExecution = jest
        .fn()
        .mockRejectedValue(new WorkflowExecutionNotFoundError('execution-404'));

      const mockRequest = {
        params: { executionId: 'execution-404' },
        body: { input: {} },
        headers: {},
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should return 409 when execution is not in WAITING_FOR_INPUT state', async () => {
      workflowsApi.resumeWorkflowExecution = jest
        .fn()
        .mockRejectedValue(
          new WorkflowExecutionInvalidStatusError('execution-123', 'running', 'waiting_for_input')
        );

      const mockRequest = {
        params: { executionId: 'execution-123' },
        body: { input: {} },
        headers: {},
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.conflict).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('waiting_for_input'),
        },
      });
    });

    it('should pass spaceId from spaces service', async () => {
      workflowsApi.resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockRequest = {
        params: { executionId: 'execution-456' },
        body: { input: { decision: 'approve' } },
        headers: {},
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.resumeWorkflowExecution).toHaveBeenCalledWith(
        'execution-456',
        'custom-space',
        { decision: 'approve' },
        mockRequest
      );
    });

    it('should propagate unexpected API errors as 500', async () => {
      const unexpectedError = new Error('Elasticsearch cluster unavailable');
      workflowsApi.resumeWorkflowExecution = jest.fn().mockRejectedValue(unexpectedError);

      const mockRequest = {
        params: { executionId: 'execution-123' },
        body: { input: {} },
        headers: {},
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Elasticsearch cluster unavailable'),
        },
      });
    });
  });
});
