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
import {
  registerExecuteWorkflowStepTool,
  EXECUTE_WORKFLOW_STEP_TOOL_ID,
} from './execute_workflow_step_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerExecuteWorkflowStepTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    testStep: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.testStep.mockResolvedValue('step-exec-456');

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerExecuteWorkflowStepTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe(EXECUTE_WORKFLOW_STEP_TOOL_ID);
  });

  it('has confirmation set to always', () => {
    expect(registeredTool.confirmation).toEqual({ askUser: 'always' });
  });

  it('executes a step with correct parameters', async () => {
    const yaml = 'version: "1"\nname: test\nsteps:\n  - name: my_step\n    type: console';
    const contextOverride = { steps: { prev: { output: { data: 'mock' } } } };
    const context = { spaceId: 'default', request: { headers: {} } } as any;

    const result = await invokeHandler(
      registeredTool,
      { workflowYaml: yaml, stepId: 'my_step', contextOverride },
      context
    );

    expect(mockApi.testStep).toHaveBeenCalledWith(yaml, 'my_step', contextOverride, 'default', context.request);
    expect(result.results).toHaveLength(1);
    expect((result.results[0].data as any).success).toBe(true);
    expect((result.results[0].data as any).workflowExecutionId).toBe('step-exec-456');
    expect((result.results[0].data as any).stepId).toBe('my_step');
  });

  it('returns error on failure', async () => {
    mockApi.testStep.mockRejectedValue(new Error('Step not found'));
    const context = { spaceId: 'default', request: { headers: {} } } as any;
    const result = await invokeHandler(
      registeredTool,
      { workflowYaml: 'yaml', stepId: 'bad_step', contextOverride: {} },
      context
    );

    expect(result.results).toHaveLength(1);
    expect((result.results[0].data as any).success).toBe(false);
    expect((result.results[0].data as any).error).toBe('Step not found');
  });
});
