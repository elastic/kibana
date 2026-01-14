/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostRunWorkflowRoute } from './post_run_workflow';
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
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/{id}/run'
      );
      routeHandler = postCall?.[1];
    });

    it('should run workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Test Workflow',
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              type: 'action',
              action: 'test-action',
            },
          ],
        },
        yaml: 'name: Test Workflow\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
      };

      const mockExecutionId = 'execution-123';

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {
            param1: 'value1',
            param2: 'value2',
          },
        },
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
        mockRequest.body.inputs,
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should preprocess alert inputs when trigger type is alert', async () => {
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

      const mockExecutionId = 'execution-123';
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

      const testMockContext = createMockRequestHandlerContext(
        { elasticsearchClient: { mget: mockMget } },
        ['test-rule-type']
      );

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

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

      expect(mockMget).toHaveBeenCalled();
      expect(workflowsApi.runWorkflow).toHaveBeenCalled();
      const runWorkflowCall = (workflowsApi.runWorkflow as jest.Mock).mock.calls[0];
      const processedInputs = runWorkflowCall[2];
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

    it('should return 404 when workflow is not found', async () => {
      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);
      const mockRequest = {
        params: { id: 'non-existent-workflow' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/non-existent-workflow/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
      expect(mockResponse.notFound).toHaveBeenCalledWith();
    });

    it('should return 400 when workflow is not valid', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Invalid Workflow',
        enabled: true,
        valid: false,
        definition: null,
        yaml: '',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Workflow is not valid.',
        },
      });
    });

    it('should return 400 when workflow is disabled', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Disabled Workflow',
        enabled: false,
        valid: true,
        definition: {
          name: 'Disabled Workflow',
          steps: [],
        },
        yaml: 'name: Disabled Workflow',
      };

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: 'Workflow is disabled. Enable it to run it.',
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Workflow execution engine failed';
      workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
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

    it('should work with different space contexts', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Space-specific Workflow',
        enabled: true,
        valid: true,
        definition: {
          name: 'Space-specific Workflow',
          steps: [],
        },
        yaml: 'name: Space-specific Workflow',
      };

      const mockExecutionId = 'execution-456';

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {
            spaceParam: 'custom-value',
          },
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
      expect(workflowsApi.runWorkflow).toHaveBeenCalledWith(
        {
          id: 'workflow-123',
          name: 'Space-specific Workflow',
          enabled: true,
          definition: mockWorkflow.definition,
          yaml: mockWorkflow.yaml,
        },
        'custom-space',
        mockRequest.body.inputs,
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          workflowExecutionId: mockExecutionId,
        },
      });
    });

    it('should handle execution engine errors', async () => {
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

      workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
      workflowsApi.runWorkflow = jest.fn().mockRejectedValue(new Error('Execution engine error'));
      const mockRequest = {
        params: { id: 'workflow-123' },
        body: {
          inputs: {},
        },
        headers: {},
        url: { pathname: '/api/workflows/workflow-123/run' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Execution engine error',
        },
      });
    });
  });
});
