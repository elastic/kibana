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
  createMockRequestHandlerContext,
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

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
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/test'
      );
      routeHandler = postCall?.[1];
    });

    it('should test workflow successfully', async () => {
      const mockExecutionId = 'test-execution-123';

      workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockRequest = {
        body: {
          workflowId: 'workflow-123',
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

      expect(workflowsApi.testWorkflow).toHaveBeenCalledWith({
        workflowId: mockRequest.body.workflowId,
        workflowYaml: mockRequest.body.workflowYaml,
        inputs: mockRequest.body.inputs,
        spaceId: 'default',
        request: mockRequest,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should preprocess alert inputs when trigger type is alert', async () => {
      const mockExecutionId = 'test-execution-123';
      const mockAlertSource = {
        '@timestamp': '2024-01-01T00:00:00Z',
        'kibana.alert.rule.uuid': 'rule-uuid-123',
        'kibana.alert.rule.name': 'Test Rule',
        'kibana.alert.rule.tags': ['tag1'],
        'kibana.alert.rule.consumer': 'test-consumer',
        'kibana.alert.rule.producer': 'test-producer',
        'kibana.alert.rule.rule_type_id': 'test-rule-type',
      };

      const mockMget = jest.fn().mockResolvedValue({
        docs: [
          { _id: 'alert-1', _index: '.alerts-test-default', found: true, _source: mockAlertSource },
        ],
      });
      mockContext = createMockRequestHandlerContext({ elasticsearchClient: { mget: mockMget } }, [
        'test-rule-type',
      ]);

      workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockRequest = {
        body: {
          workflowYaml: 'name: Test Workflow',
          inputs: {
            event: {
              triggerType: 'alert',
              alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
            },
          },
        },
        headers: {},
        url: { pathname: '/api/workflows/test' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockMget).toHaveBeenCalled();
      expect(workflowsApi.testWorkflow).toHaveBeenCalled();
      const testWorkflowCall = (workflowsApi.testWorkflow as jest.Mock).mock.calls[0];
      const processedInputs = testWorkflowCall[0].inputs;
      // Verify that inputs were transformed
      expect(processedInputs.event.alerts).toBeDefined();
      expect(processedInputs.event.rule).toBeDefined();
      expect(processedInputs.event.rule.id).toBe('rule-uuid-123');
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should return error when alert preprocessing fails', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Test Workflow',
          steps: [],
        },
        yaml: 'name: Test Workflow',
      };

      const mockMget = jest.fn().mockRejectedValue(new Error('Elasticsearch error'));

      const testMockContext = createMockRequestHandlerContext(
        { elasticsearchClient: { mget: mockMget } },
        ['test-rule-type']
      );

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {
            event: {
              triggerType: 'alert',
              alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
            },
          },
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(testMockContext, mockRequest, mockResponse);

      // Should return an error when preprocessing fails
      expect(mockMget).toHaveBeenCalled();
      expect(workflowsApi.runWorkflow).not.toHaveBeenCalled();
      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          body: expect.objectContaining({
            message: expect.stringContaining('Elasticsearch error'),
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Workflow execution engine failed';
      workflowsApi.testWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

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

      expect(workflowsApi.testWorkflow).toHaveBeenCalledWith({
        workflowId: undefined,
        workflowYaml: mockRequest.body.workflowYaml,
        inputs: mockRequest.body.inputs,
        spaceId: 'custom-space',
        request: mockRequest,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should handle execution engine errors', async () => {
      const executionError = new Error('Execution engine connection failed');
      workflowsApi.testWorkflow = jest.fn().mockRejectedValue(executionError);

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
  });
});
