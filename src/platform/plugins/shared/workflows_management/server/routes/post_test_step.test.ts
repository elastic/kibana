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
import { registerPostTestStepRoute } from './post_test_step';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import type { WorkflowsManagementApi } from '../service/workflows_management_api';

jest.mock('./lib/with_license_check', () => ({
  withLicenseCheck: (handler: unknown) => handler,
}));

describe('POST /api/workflows/testStep', () => {
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
      registerPostTestStepRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const route = mockRouter.versioned.getRoute('post', WORKFLOWS_API_PATHS.TEST_STEP);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should test step successfully', async () => {
      const mockExecutionId = 'test-step-execution-123';

      workflowsApi.testStep = jest.fn().mockResolvedValue(mockExecutionId);

      const mockContext = {};
      const mockRequest = {
        body: {
          workflowYaml:
            'name: Test Workflow\nenabled: true\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          stepId: 'step1',
          contextOverride: { param1: 'value1', param2: 'value2' },
        },
        headers: {},
        url: { pathname: '/api/workflows/testStep' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.testStep).toHaveBeenCalledWith(
        mockRequest.body.workflowYaml,
        mockRequest.body.stepId,
        mockRequest.body.contextOverride,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { workflowExecutionId: mockExecutionId },
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Step execution engine failed';
      workflowsApi.testStep = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: {
          workflowYaml: 'name: Test Workflow',
          stepId: 'step1',
          contextOverride: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/testStep' },
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
