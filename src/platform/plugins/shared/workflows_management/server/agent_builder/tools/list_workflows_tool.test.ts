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
import { registerListWorkflowsTool } from './list_workflows_tool';

const mockWorkflowsResponse = {
  page: 1,
  size: 20,
  total: 2,
  results: [
    {
      id: 'wf-1',
      name: 'Alert Triage',
      description: 'Automated alert triage',
      enabled: true,
      definition: null,
      createdAt: '2025-01-01',
      history: [],
      tags: ['security'],
      valid: true,
    },
    {
      id: 'wf-2',
      name: 'JAMF Reminder',
      description: 'Remind users about JAMF',
      enabled: false,
      definition: null,
      createdAt: '2025-01-02',
      history: [],
      tags: ['integrations'],
      valid: true,
    },
  ],
};

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerListWorkflowsTool', () => {
  let registeredTool: BuiltinToolDefinition;
  const mockApi = {
    getWorkflows: jest.fn().mockResolvedValue(mockWorkflowsResponse),
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
    registerListWorkflowsTool(agentBuilder, mockApi);
  });

  const context = { spaceId: 'default' } as any;

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.list_workflows');
  });

  it('returns workflows without filter', async () => {
    const result = await invokeHandler(registeredTool, {}, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(2);
    expect(data.total).toBe(2);
    expect(data.workflows).toHaveLength(2);
  });

  it('passes query parameters to API', async () => {
    await invokeHandler(
      registeredTool,
      { query: 'alert', enabled: true, tags: ['security'], size: 10 },
      context
    );
    expect(mockApi.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'alert',
        enabled: [true],
        tags: ['security'],
        size: 10,
        page: 1,
      }),
      'default'
    );
  });

  it('uses default size of 20', async () => {
    await invokeHandler(registeredTool, {}, context);
    expect(mockApi.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ size: 20 }),
      'default'
    );
  });

  it('returns results in expected shape', async () => {
    const result = await invokeHandler(registeredTool, {}, context);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    const data = result.results[0].data as any;
    for (const wf of data.workflows) {
      expect(wf).toHaveProperty('id');
      expect(wf).toHaveProperty('name');
      expect(wf).toHaveProperty('enabled');
    }
  });
});
