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
import { registerExecuteWorkflowTool, EXECUTE_WORKFLOW_TOOL_ID } from './execute_workflow_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerExecuteWorkflowTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    testWorkflow: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.testWorkflow.mockResolvedValue('exec-123');

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerExecuteWorkflowTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe(EXECUTE_WORKFLOW_TOOL_ID);
  });

  it('has confirmation set to always', () => {
    expect(registeredTool.confirmation).toEqual({ askUser: 'always' });
  });

  it('executes workflow by ID and returns execution ID', async () => {
    const context = { spaceId: 'default', request: { headers: {} } } as any;
    const result = await invokeHandler(
      registeredTool,
      { workflowId: 'wf-1', inputs: { key: 'value' } },
      context
    );

    expect(mockApi.testWorkflow).toHaveBeenCalledWith({
      workflowId: 'wf-1',
      workflowYaml: undefined,
      inputs: { key: 'value' },
      spaceId: 'default',
      request: context.request,
    });
    expect(result.results).toHaveLength(1);
    expect((result.results[0].data as any).success).toBe(true);
    expect((result.results[0].data as any).workflowExecutionId).toBe('exec-123');
  });

  it('executes workflow by inline YAML', async () => {
    const yaml = 'version: "1"\nname: test\nenabled: true\ntriggers:\n  - type: manual\nsteps: []';
    const context = { spaceId: 'default', request: { headers: {} } } as any;
    const result = await invokeHandler(registeredTool, { workflowYaml: yaml, inputs: {} }, context);

    expect(mockApi.testWorkflow).toHaveBeenCalledWith({
      workflowId: undefined,
      workflowYaml: yaml,
      inputs: {},
      spaceId: 'default',
      request: context.request,
    });
    expect((result.results[0].data as any).success).toBe(true);
  });

  it('returns error on failure', async () => {
    mockApi.testWorkflow.mockRejectedValue(new Error('Validation failed'));
    const context = { spaceId: 'default', request: { headers: {} } } as any;
    const result = await invokeHandler(
      registeredTool,
      { workflowId: 'wf-1', inputs: {} },
      context
    );

    expect(result.results).toHaveLength(1);
    expect((result.results[0].data as any).success).toBe(false);
    expect((result.results[0].data as any).error).toBe('Validation failed');
  });
});
