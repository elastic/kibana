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
import { registerPostTestWorkflowRoute } from './post_test_workflow';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import type { WorkflowsManagementApi } from '../service/workflows_management_api';

jest.mock('./lib/with_license_check', () => ({
  withLicenseCheck: (handler: unknown) => handler,
}));

describe('POST /api/workflows/test', () => {
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
      registerPostTestWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const route = mockRouter.versioned.getRoute('post', WORKFLOWS_API_PATHS.TEST);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should test workflow successfully', async () => {
      const mockExecutionId = 'test-execution-123';

      workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          workflowYaml:
            'name: Test Workflow\nenabled: true\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          inputs: { param1: 'value1', param2: 'value2' },
        },
        headers: {},
        url: { pathname: '/api/workflows/test' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.testWorkflow).toHaveBeenCalledWith({
        workflowId: mockRequest.body.workflowId,
        workflowYaml: mockRequest.body.workflowYaml,
        inputs: mockRequest.body.inputs,
        spaceId: 'default',
        request: mockRequest,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { workflowExecutionId: mockExecutionId },
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Test execution failed';
      workflowsApi.testWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
          workflowYaml: 'name: Test Workflow',
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/test' },
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
