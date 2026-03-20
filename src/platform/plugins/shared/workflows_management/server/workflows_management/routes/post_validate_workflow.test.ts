/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostValidateWorkflowRoute } from './post_validate_workflow';
import {
  createMockRequestHandlerContext,
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { ValidateWorkflowResponse } from '../../../common/lib/validate_workflow_yaml';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /internal/workflows/_validate', () => {
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
      registerPostValidateWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/internal/workflows/_validate'
      );
      routeHandler = postCall?.[1];
    });

    it('should register a POST route at /internal/workflows/_validate', () => {
      expect(mockRouter.post).toHaveBeenCalledTimes(1);
      const [config] = (mockRouter.post as jest.Mock).mock.calls[0];
      expect(config.path).toBe('/internal/workflows/_validate');
    });

    it('should return validation result on success', async () => {
      const validationResult: ValidateWorkflowResponse = {
        valid: true,
        diagnostics: [],
      };
      workflowsApi.validateWorkflow = jest.fn().mockResolvedValue(validationResult);

      const mockRequest = {
        body: { yaml: 'name: Test' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.validateWorkflow).toHaveBeenCalledWith(
        'name: Test',
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: validationResult });
    });

    it('should return diagnostics when validation fails', async () => {
      const validationResult: ValidateWorkflowResponse = {
        valid: false,
        diagnostics: [
          {
            severity: 'error',
            message: 'Required',
            source: 'schema',
            path: ['name'],
          },
        ],
      };
      workflowsApi.validateWorkflow = jest.fn().mockResolvedValue(validationResult);

      const mockRequest = {
        body: { yaml: 'steps: []' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: validationResult });
    });

    it('should return 500 on internal error', async () => {
      workflowsApi.validateWorkflow = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      const mockRequest = {
        body: { yaml: 'name: Test' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Service unavailable'),
        },
      });
    });
  });
});
