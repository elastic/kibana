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
  registerGetWorkflowExecutionStatusTool,
  GET_WORKFLOW_EXECUTION_STATUS_TOOL_ID,
} from './get_workflow_execution_status_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetWorkflowExecutionStatusTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    getWorkflowExecution: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerGetWorkflowExecutionStatusTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe(GET_WORKFLOW_EXECUTION_STATUS_TOOL_ID);
  });

  it('does not require confirmation', () => {
    expect(registeredTool.confirmation).toBeUndefined();
  });

  it('returns completed execution details', async () => {
    mockApi.getWorkflowExecution.mockResolvedValue({
      id: 'exec-123',
      status: 'completed',
      workflowId: 'wf-1',
      workflowName: 'Test Workflow',
      isTestRun: true,
      startedAt: '2026-03-05T00:00:00Z',
      finishedAt: '2026-03-05T00:00:05Z',
      duration: 5000,
      error: null,
      stepExecutions: [
        {
          stepId: 'step_1',
          stepType: 'console',
          status: 'completed',
          startedAt: '2026-03-05T00:00:00Z',
          finishedAt: '2026-03-05T00:00:01Z',
          executionTimeMs: 1000,
          error: undefined,
          output: { message: 'done' },
        },
      ],
    });

    const context = { spaceId: 'default' } as any;
    const result = await invokeHandler(
      registeredTool,
      { executionId: 'exec-123', includeOutput: true },
      context
    );

    expect(mockApi.getWorkflowExecution).toHaveBeenCalledWith('exec-123', 'default', {
      includeInput: false,
      includeOutput: true,
    });
    const data = result.results[0].data as any;
    expect(data.status).toBe('completed');
    expect(data.isComplete).toBe(true);
    expect(data.stepExecutions).toHaveLength(1);
    expect(data.stepExecutions[0].output).toEqual({ message: 'done' });
    expect(data.hint).toBeUndefined();
  });

  it('returns in-progress execution with hint', async () => {
    mockApi.getWorkflowExecution.mockResolvedValue({
      id: 'exec-456',
      status: 'running',
      workflowId: 'wf-2',
      workflowName: 'Running Workflow',
      isTestRun: true,
      startedAt: '2026-03-05T00:00:00Z',
      finishedAt: null,
      duration: null,
      error: null,
      stepExecutions: [],
    });

    const context = { spaceId: 'default' } as any;
    const result = await invokeHandler(
      registeredTool,
      { executionId: 'exec-456', includeOutput: true },
      context
    );

    const data = result.results[0].data as any;
    expect(data.status).toBe('running');
    expect(data.isComplete).toBe(false);
    expect(data.hint).toBeDefined();
  });

  it('returns error when execution not found', async () => {
    mockApi.getWorkflowExecution.mockResolvedValue(null);

    const context = { spaceId: 'default' } as any;
    const result = await invokeHandler(
      registeredTool,
      { executionId: 'exec-missing' },
      context
    );

    const data = result.results[0].data as any;
    expect(data.error).toContain('not found');
  });

  it('returns error on API failure', async () => {
    mockApi.getWorkflowExecution.mockRejectedValue(new Error('ES connection failed'));

    const context = { spaceId: 'default' } as any;
    const result = await invokeHandler(
      registeredTool,
      { executionId: 'exec-123' },
      context
    );

    const data = result.results[0].data as any;
    expect(data.error).toBe('ES connection failed');
  });
});
