/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ExecutionStatus } from '@kbn/workflows';
import {
  registerWorkflowExecuteStepTool,
  WORKFLOW_EXECUTE_STEP_TOOL_ID,
} from './workflow_execute_step_tool';

const VALID_WORKFLOW_YAML = `version: '1'
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "hello"
  - name: search_step
    type: elasticsearch.search
    with:
      index: my-index
      body:
        query:
          match_all: {}
  - name: send_slack
    type: slack
    connector-id: my-slack
    with:
      message: "notification"
  - name: delete_index
    type: elasticsearch.indices.delete
    with:
      index: temp-index
`;

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

const createMockContext = (yaml?: string) => ({
  spaceId: 'default',
  request: { headers: {} },
  attachments: {
    getActive: jest.fn().mockReturnValue(
      yaml
        ? [
            {
              type: 'workflow.yaml',
              id: 'att-1',
              versions: [{ data: { yaml, workflowId: 'wf-1' } }],
            },
          ]
        : []
    ),
  },
});

describe('registerWorkflowExecuteStepTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    testStep: jest.fn(),
    getWorkflowExecution: jest.fn(),
    validateWorkflow: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerWorkflowExecuteStepTool(agentBuilder, mockApi);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe(WORKFLOW_EXECUTE_STEP_TOOL_ID);
  });

  it('returns error when no workflow.yaml attachment is present', async () => {
    const context = createMockContext();
    const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);

    expect(result.results[0].data).toEqual({
      success: false,
      error: 'No workflow YAML attachment found in the conversation',
    });
  });

  it('returns error when step name is not found', async () => {
    const context = createMockContext(VALID_WORKFLOW_YAML);
    const result = await invokeHandler(registeredTool, { stepName: 'nonexistent_step' }, context);

    expect(result.results[0].data).toEqual({
      success: false,
      error: 'Step "nonexistent_step" not found in the workflow YAML',
    });
  });

  describe('safe step execution', () => {
    it('executes a console step and returns result', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-123');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [
          {
            stepId: 'log_step',
            status: ExecutionStatus.COMPLETED,
          },
        ],
        error: null,
        duration: 150,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.executionId).toBe('exec-123');
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
      expect(data.duration).toBe(150);
      expect(mockApi.testStep).toHaveBeenCalledWith(
        VALID_WORKFLOW_YAML,
        'log_step',
        {},
        'default',
        context.request
      );
    });

    it('executes an elasticsearch.search step (safe)', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-456');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ stepId: 'search_step', status: ExecutionStatus.COMPLETED }],
        error: null,
        duration: 200,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'search_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect(data.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('passes contextOverride to testStep', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-789');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
        error: null,
        duration: 50,
      });

      const override = { steps: { prev: { output: { data: [1, 2, 3] } } } };
      const context = createMockContext(VALID_WORKFLOW_YAML);
      await invokeHandler(
        registeredTool,
        { stepName: 'log_step', contextOverride: override },
        context
      );

      expect(mockApi.testStep).toHaveBeenCalledWith(
        VALID_WORKFLOW_YAML,
        'log_step',
        override,
        'default',
        context.request
      );
    });

    it('returns failed status when step execution fails', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockResolvedValue('exec-fail');
      mockApi.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.FAILED,
        stepExecutions: [{ stepId: 'log_step', status: ExecutionStatus.FAILED }],
        error: { message: 'Step failed' },
        duration: 100,
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.status).toBe(ExecutionStatus.FAILED);
      expect(data.error).toEqual({ message: 'Step failed' });
    });

    it('returns error when testStep throws', async () => {
      jest.useRealTimers();

      mockApi.testStep.mockRejectedValue(new Error('Workflow validation failed'));

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'log_step' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.success).toBe(false);
      expect(data.error).toBe('Workflow validation failed');
    });
  });

  describe('unsafe step blocking', () => {
    it('blocks a slack connector step with preview', async () => {
      mockApi.validateWorkflow.mockResolvedValue({
        valid: true,
        diagnostics: [],
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('slack');
      expect(data.stepConfig).toBeDefined();
      expect(data.validation).toEqual({ valid: true });
      expect(data.hint).toContain('Run step');
      expect(mockApi.testStep).not.toHaveBeenCalled();
    });

    it('blocks elasticsearch.indices.delete with preview', async () => {
      mockApi.validateWorkflow.mockResolvedValue({
        valid: false,
        diagnostics: [{ severity: 'error', source: 'schema', message: 'Invalid index name' }],
      });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'delete_index' }, context);
      const data = result.results[0].data as Record<string, unknown>;

      expect(data.blocked).toBe(true);
      expect(data.stepType).toBe('elasticsearch.indices.delete');
      expect(data.reason).toContain('external side effects');
      expect(data.validation).toEqual({
        valid: false,
        errors: ['[schema] Invalid index name'],
      });
    });

    it('includes step config in blocked preview', async () => {
      mockApi.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });

      const context = createMockContext(VALID_WORKFLOW_YAML);
      const result = await invokeHandler(registeredTool, { stepName: 'send_slack' }, context);
      const data = result.results[0].data as Record<string, unknown>;
      const config = data.stepConfig as Record<string, unknown>;

      expect(config.name).toBe('send_slack');
      expect(config.type).toBe('slack');
      expect(config['connector-id']).toBe('my-slack');
    });
  });
});
