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
import { registerDeployWorkflowTool } from './deploy_workflow_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerDeployWorkflowTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const validYaml = `version: '1'\nname: test\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: log\n    type: console\n    with:\n      message: hi\n`;

  const mockApi = {
    validateWorkflow: jest.fn(),
    getWorkflow: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.validateWorkflow.mockResolvedValue({ valid: true, diagnostics: [] });
    mockApi.getWorkflow.mockResolvedValue(null);
    mockApi.createWorkflow.mockResolvedValue({ id: 'created-id', name: 'test' });
    mockApi.updateWorkflow.mockResolvedValue({ id: 'updated-id' });

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerDeployWorkflowTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.deploy_workflow');
  });

  it('refuses to deploy when validation fails and never calls create/update', async () => {
    mockApi.validateWorkflow.mockResolvedValueOnce({
      valid: false,
      diagnostics: [{ severity: 'error', message: 'bad', path: [] }],
    });

    const result = await invokeHandler(
      registeredTool,
      { yaml: 'invalid yaml' },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.createWorkflow).not.toHaveBeenCalled();
    expect(mockApi.updateWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).deployed).toBe(false);
    expect((result.results[0].data as any).reason).toBe('validation_failed');
  });

  it('creates a new workflow when no id is provided', async () => {
    const result = await invokeHandler(
      registeredTool,
      { yaml: validYaml },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.createWorkflow).toHaveBeenCalledWith({ yaml: validYaml }, 'default', {});
    expect(mockApi.getWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).action).toBe('created');
    expect((result.results[0].data as any).id).toBe('created-id');
  });

  it('updates the workflow when id is provided and the workflow exists', async () => {
    mockApi.getWorkflow.mockResolvedValueOnce({ id: 'foo' });

    const result = await invokeHandler(
      registeredTool,
      { yaml: validYaml, id: 'foo' },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.getWorkflow).toHaveBeenCalledWith('foo', 'default');
    expect(mockApi.updateWorkflow).toHaveBeenCalledWith('foo', { yaml: validYaml }, 'default', {});
    expect(mockApi.createWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).action).toBe('updated');
    expect((result.results[0].data as any).id).toBe('foo');
  });

  it('creates with a custom id when id is provided but the workflow does not yet exist', async () => {
    mockApi.getWorkflow.mockResolvedValueOnce(null);

    const result = await invokeHandler(
      registeredTool,
      { yaml: validYaml, id: 'brand-new' },
      { spaceId: 'default', request: {} }
    );

    expect(mockApi.createWorkflow).toHaveBeenCalledWith(
      { yaml: validYaml, id: 'brand-new' },
      'default',
      {}
    );
    expect(mockApi.updateWorkflow).not.toHaveBeenCalled();
    expect((result.results[0].data as any).action).toBe('created');
  });
});
