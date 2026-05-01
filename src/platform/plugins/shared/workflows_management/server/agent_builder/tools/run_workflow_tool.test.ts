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
import { registerRunWorkflowTool } from './run_workflow_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerRunWorkflowTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    getWorkflow: jest.fn(),
    runWorkflow: jest.fn(),
    testWorkflow: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.runWorkflow.mockResolvedValue('exec-123');
    mockApi.testWorkflow.mockResolvedValue('test-exec-456');
    mockApi.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: 'wf one',
      enabled: true,
      valid: true,
      yaml: 'version: "1"\nname: wf one\n',
      definition: { name: 'wf one', steps: [] },
    });

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerRunWorkflowTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.run_workflow');
  });

  it('runs an existing workflow by id and returns the executionId', async () => {
    const result = await invokeHandler(
      registeredTool,
      { workflowId: 'wf-1', inputs: { foo: 'bar' } },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.getWorkflow).toHaveBeenCalledWith('wf-1', 'default');
    expect(mockApi.runWorkflow).toHaveBeenCalledTimes(1);
    expect(mockApi.testWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).workflowExecutionId).toBe('exec-123');
  });

  it('uses testWorkflow when inline yaml is provided', async () => {
    const yaml = 'version: "1"\nname: t\nenabled: true\ntriggers: [{type: manual}]\nsteps: []\n';
    const result = await invokeHandler(
      registeredTool,
      { yaml, inputs: {} },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.testWorkflow).toHaveBeenCalledWith({
      workflowYaml: yaml,
      workflowId: undefined,
      inputs: {},
      spaceId: 'default',
      request: {},
    });
    expect(mockApi.runWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).workflowExecutionId).toBe('test-exec-456');
    expect((result.results[0].data as any).isTestRun).toBe(true);
  });

  it('returns workflow_not_found when the workflow id does not exist', async () => {
    mockApi.getWorkflow.mockResolvedValueOnce(null);

    const result = await invokeHandler(
      registeredTool,
      { workflowId: 'missing' },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.runWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).executed).toBe(false);
    expect((result.results[0].data as any).reason).toBe('workflow_not_found');
  });

  it('returns workflow_disabled when the workflow exists but is disabled', async () => {
    mockApi.getWorkflow.mockResolvedValueOnce({
      id: 'wf-1',
      name: 'wf',
      enabled: false,
      valid: true,
      yaml: 'yaml',
      definition: { name: 'wf', steps: [] },
    });

    const result = await invokeHandler(
      registeredTool,
      { workflowId: 'wf-1' },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.runWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).reason).toBe('workflow_disabled');
  });
});
