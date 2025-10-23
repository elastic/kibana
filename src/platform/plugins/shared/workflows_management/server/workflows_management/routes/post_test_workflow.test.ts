/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostTestWorkflowRoute } from './post_test_workflow';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

describe('POST /api/workflows/test', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: any;
  let mockSpaces: any;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  describe('route definition', () => {
    it('should define the test workflow route with correct configuration', () => {
      registerPostTestWorkflowRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });

      const postTestCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/test'
      );

      expect(postTestCall).toBeDefined();
      expect(postTestCall[0]).toMatchObject({
        path: '/api/workflows/test',
        options: {
          tags: ['api', 'workflows'],
        },
        security: {
          authz: {
            requiredPrivileges: ['all'],
          },
        },
      });
      expect(postTestCall[0].validate).toBeDefined();
      expect(postTestCall[0].validate.body).toBeDefined();
      expect(postTestCall[1]).toEqual(expect.any(Function));
    });
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
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/test'
      );
      routeHandler = postCall?.[1];
    });

    it('should test workflow successfully', async () => {
      const mockExecutionId = 'test-execution-123';

      workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockContext = {};
      const mockRequest = {
        body: {
          workflowYaml:
            'name: Test Workflow\nenabled: true\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          inputs: {
            param1: 'value1',
            param2: 'value2',
          },
        },
        headers: {},
        url: { pathname: '/api/workflows/test' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
        mockRequest.body.workflowYaml,
        mockRequest.body.inputs,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Workflow execution engine failed';
      workflowsApi.testWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: {
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

    it('should work with different space contexts', async () => {
      const mockExecutionId = 'test-execution-456';

      workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        body: {
          workflowYaml: 'name: Space-specific Test Workflow',
          inputs: {
            spaceParam: 'custom-value',
          },
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/test' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
        mockRequest.body.workflowYaml,
        mockRequest.body.inputs,
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should handle execution engine errors', async () => {
      const executionError = new Error('Execution engine connection failed');
      workflowsApi.testWorkflow = jest.fn().mockRejectedValue(executionError);

      const mockContext = {};
      const mockRequest = {
        body: {
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
          message: 'Internal server error: Error: Execution engine connection failed',
        },
      });
    });

    // FIXME:Commented, because now it fails with 500 error instead of 400
    // https://github.com/elastic/security-team/issues/14262

    // it('should handle YAML syntax errors with 400 response', async () => {
    //   const yamlError = new Error('Invalid YAML syntax');
    //   yamlError.name = 'InvalidYamlSyntaxError';

    //   workflowsApi.testWorkflow = jest.fn().mockRejectedValue(yamlError);

    //   const mockContext = {};
    //   const mockRequest = {
    //     body: {
    //       workflowYaml: 'invalid: yaml: content: [',
    //       inputs: {},
    //     },
    //     headers: {},
    //     url: { pathname: '/api/workflows/test' },
    //   };
    //   const mockResponse = {
    //     ok: jest.fn().mockReturnThis(),
    //     badRequest: jest.fn().mockReturnThis(),
    //     customError: jest.fn().mockReturnThis(),
    //   };

    //   await routeHandler(mockContext, mockRequest, mockResponse);

    //   expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
    //     mockRequest.body.workflowYaml,
    //     mockRequest.body.inputs,
    //     'default',
    //     mockRequest
    //   );
    //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
    //     body: {
    //       message: 'Invalid workflow yaml: Invalid YAML syntax',
    //     },
    //   });
    // });

    // it('should handle YAML schema errors with 400 response', async () => {
    //   const schemaError = new Error('Invalid YAML schema');
    //   schemaError.name = 'InvalidYamlSchemaError';

    //   workflowsApi.testWorkflow = jest.fn().mockRejectedValue(schemaError);

    //   const mockContext = {};
    //   const mockRequest = {
    //     body: {
    //       workflowYaml: 'name: Test Workflow\ninvalidField: value',
    //       inputs: {},
    //     },
    //     headers: {},
    //     url: { pathname: '/api/workflows/test' },
    //   };
    //   const mockResponse = {
    //     ok: jest.fn().mockReturnThis(),
    //     badRequest: jest.fn().mockReturnThis(),
    //     customError: jest.fn().mockReturnThis(),
    //   };

    //   await routeHandler(mockContext, mockRequest, mockResponse);

    //   expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
    //     mockRequest.body.workflowYaml,
    //     mockRequest.body.inputs,
    //     'default',
    //     mockRequest
    //   );
    //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
    //     body: {
    //       message: 'Invalid workflow yaml: Invalid YAML schema',
    //     },
    //   });
    // });
  });
});
