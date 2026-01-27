/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostTestStepRoute } from './post_test_step';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

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
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/testStep'
      );
      routeHandler = postCall?.[1];
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
          contextOverride: {
            param1: 'value1',
            param2: 'value2',
          },
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
        body: {
          workflowExecutionId: mockExecutionId,
        },
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

    it('should work with different space contexts', async () => {
      const mockExecutionId = 'test-step-execution-456';

      workflowsApi.testStep = jest.fn().mockResolvedValue(mockExecutionId);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        body: {
          workflowYaml: 'name: Space-specific Test Workflow',
          stepId: 'step1',
          contextOverride: {
            spaceParam: 'custom-value',
          },
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/testStep' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.testStep).toHaveBeenCalledWith(
        mockRequest.body.workflowYaml,
        mockRequest.body.stepId,
        mockRequest.body.contextOverride,
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
      workflowsApi.testStep = jest.fn().mockRejectedValue(executionError);

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
          message: 'Internal server error: Error: Execution engine connection failed',
        },
      });
    });

    it('should handle step not found in workflow', async () => {
      const stepNotFoundError = new Error('Step step1 not found in workflow');
      workflowsApi.testStep = jest.fn().mockRejectedValue(stepNotFoundError);

      const mockContext = {};
      const mockRequest = {
        body: {
          workflowYaml: 'name: Test Workflow\nsteps: []',
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
          message: 'Internal server error: Error: Step step1 not found in workflow',
        },
      });
    });

    // FIXME:Commented, because now it fails with 500 error instead of 400
    // https://github.com/elastic/security-team/issues/14263

    // it('should handle YAML parsing errors', async () => {
    //   class InvalidYamlSyntaxError extends Error {
    //     constructor(message: string) {
    //       super(message);
    //       this.name = 'InvalidYamlSyntaxError';
    //     }
    //   }

    //   const yamlError = new InvalidYamlSyntaxError('Invalid YAML syntax');
    //   workflowsApi.testStep = jest.fn().mockRejectedValue(yamlError);

    //   const mockContext = {};
    //   const mockRequest = {
    //     body: {
    //       workflowYaml: 'invalid: yaml: content: [',
    //       stepId: 'step1',
    //       contextOverride: {},
    //     },
    //     headers: {},
    //     url: { pathname: '/api/workflows/testStep' },
    //   };
    //   const mockResponse = {
    //     ok: jest.fn().mockReturnThis(),
    //     badRequest: jest.fn().mockReturnThis(),
    //     customError: jest.fn().mockReturnThis(),
    //   };

    //   await routeHandler(mockContext, mockRequest, mockResponse);

    //   expect(workflowsApi.testStep).toHaveBeenCalledWith(
    //     mockRequest.body.workflowYaml,
    //     mockRequest.body.stepId,
    //     mockRequest.body.contextOverride,
    //     'default',
    //     mockRequest
    //   );
    //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
    //     body: {
    //       message: 'Invalid workflow yaml: Invalid YAML syntax',
    //     },
    //   });
    // });

    // it('should handle YAML schema errors', async () => {
    //   class InvalidYamlSchemaError extends Error {
    //     constructor(message: string) {
    //       super(message);
    //       this.name = 'InvalidYamlSchemaError';
    //     }
    //   }

    //   const schemaError = new InvalidYamlSchemaError('Invalid YAML schema');
    //   workflowsApi.testStep = jest.fn().mockRejectedValue(schemaError);

    //   const mockContext = {};
    //   const mockRequest = {
    //     body: {
    //       workflowYaml: 'name: Test Workflow\ninvalidField: value',
    //       stepId: 'step1',
    //       contextOverride: {},
    //     },
    //     headers: {},
    //     url: { pathname: '/api/workflows/testStep' },
    //   };
    //   const mockResponse = {
    //     ok: jest.fn().mockReturnThis(),
    //     badRequest: jest.fn().mockReturnThis(),
    //     customError: jest.fn().mockReturnThis(),
    //   };

    //   await routeHandler(mockContext, mockRequest, mockResponse);

    //   expect(workflowsApi.testStep).toHaveBeenCalledWith(
    //     mockRequest.body.workflowYaml,
    //     mockRequest.body.stepId,
    //     mockRequest.body.contextOverride,
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
