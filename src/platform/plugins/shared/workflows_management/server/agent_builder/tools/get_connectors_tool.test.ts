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
import { registerGetConnectorsTool } from './get_connectors_tool';

const mockConnectorResponse = {
  connectorTypes: {
    '.slack': {
      instances: [
        { id: 'slack-1', name: 'Slack #general', isPreconfigured: false, isDeprecated: false },
        { id: 'slack-2', name: 'Slack #alerts', isPreconfigured: false, isDeprecated: false },
      ],
      subActions: [],
    },
    '.jira': {
      instances: [
        { id: 'jira-1', name: 'Jira Project', isPreconfigured: false, isDeprecated: false },
      ],
      subActions: [],
    },
    '.inference': {
      instances: [
        { id: 'inf-1', name: 'My Inference', isPreconfigured: false, isDeprecated: false },
      ],
      subActions: [
        { name: 'completion', displayName: 'Completion' },
        { name: 'rerank', displayName: 'Rerank' },
      ],
    },
  },
  totalConnectors: 4,
};

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetConnectorsTool', () => {
  let registeredTool: BuiltinToolDefinition;
  const mockApi = {
    getAvailableConnectors: jest.fn().mockResolvedValue(mockConnectorResponse),
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
    registerGetConnectorsTool(agentBuilder, mockApi);
  });

  const context = { spaceId: 'default', request: {} } as any;

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_connectors');
  });

  it('returns all connectors without filter', async () => {
    const result = await invokeHandler(registeredTool, {}, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(4);
    expect(data.totalAvailable).toBe(4);
    expect(data.connectors).toHaveLength(4);
  });

  it('filters by actionTypeId', async () => {
    const result = await invokeHandler(registeredTool, { actionTypeId: '.jira' }, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    expect(data.connectors[0].actionTypeId).toBe('.jira');
    expect(data.connectors[0].stepTypes).toEqual(['jira']);
  });

  it('filters by base stepType', async () => {
    const result = await invokeHandler(registeredTool, { stepType: 'slack' }, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(2);
    expect(data.connectors.every((c: any) => c.stepTypes.includes('slack'))).toBe(true);
  });

  it('filters by sub-action stepType', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'inference.completion' },
      context
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    expect(data.connectors[0].actionTypeId).toBe('.inference');
    expect(data.connectors[0].stepTypes).toContain('inference.completion');
  });

  it('returns stepTypes with sub-actions for V2 connectors', async () => {
    const result = await invokeHandler(registeredTool, { actionTypeId: '.inference' }, context);
    const data = result.results[0].data as any;
    expect(data.connectors[0].stepTypes).toEqual(['inference.completion', 'inference.rerank']);
  });

  it('returns stepTypes with base type for V1 connectors', async () => {
    const result = await invokeHandler(registeredTool, { actionTypeId: '.slack' }, context);
    const data = result.results[0].data as any;
    expect(data.connectors[0].stepTypes).toEqual(['slack']);
  });

  it('filters by search term', async () => {
    const result = await invokeHandler(registeredTool, { search: 'alerts' }, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    expect(data.connectors[0].name).toBe('Slack #alerts');
  });

  it('returns results in expected shape', async () => {
    const result = await invokeHandler(registeredTool, {}, context);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    const data = result.results[0].data as any;
    for (const connector of data.connectors) {
      expect(connector).toHaveProperty('id');
      expect(connector).toHaveProperty('name');
      expect(connector).toHaveProperty('actionTypeId');
      expect(connector).toHaveProperty('stepTypes');
    }
  });
});
