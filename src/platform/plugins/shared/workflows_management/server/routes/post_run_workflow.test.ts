/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createMockRequestHandlerContext,
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './lib/test_utils';
import { registerPostRunWorkflowRoute } from './post_run_workflow';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import type { WorkflowsManagementApi } from '../service/workflows_management_api';

jest.mock('./lib/with_license_check', () => ({
  withLicenseCheck: (handler: unknown) => handler,
}));

describe('POST /api/workflows/{id}/run', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: any;
  let mockSpaces: any;
  let mockContext: ReturnType<typeof createMockRequestHandlerContext>;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    mockContext = createMockRequestHandlerContext();
    jest.clearAllMocks();
  });

  describe('handler logic', () => {
    let routeHandler: any;

    beforeEach(() => {
      registerPostRunWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const route = mockRouter.versioned.getRoute('post', WORKFLOWS_API_PATHS.RUN);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should run workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Test Workflow',
          steps: [{ id: 'step1', name: 'First Step', type: 'action', action: 'test-action' }],
        },
        yaml: 'name: Test Workflow\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
      };

      const mockExecutionId = 'execution-123';

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockRequest = {
        params: { id: 'workflow-123' },
        body: { inputs: { param1: 'value1', param2: 'value2' } },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(workflowsApi.runWorkflow).toHaveBeenCalledWith(
        {
          id: 'workflow-123',
          name: 'Test Workflow',
          enabled: true,
          definition: mockWorkflow.definition,
          yaml: mockWorkflow.yaml,
        },
        'default',
        { param1: 'value1', param2: 'value2' },
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { workflowExecutionId: mockExecutionId },
      });
    });

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        body: { inputs: {} },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Execution engine failed';
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue({
        id: 'workflow-123',
        name: 'Test',
        enabled: true,
        valid: true,
        definition: { name: 'Test', steps: [] },
        yaml: 'name: Test',
      });
      workflowsApi.runWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockRequest = {
        params: { id: 'workflow-123' },
        body: { inputs: {} },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
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
  });
});
