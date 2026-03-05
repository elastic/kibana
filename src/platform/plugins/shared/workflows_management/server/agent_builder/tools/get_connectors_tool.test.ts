/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StaticToolRegistration } from '@kbn/agent-builder-common';
import type { ZodObject, ZodRawShape } from '@kbn/zod';
import { registerGetConnectorsTool } from './get_connectors_tool';

const mockConnectorResponse = {
  connectorsByType: {
    '.slack': {
      instances: [
        { id: 'slack-1', name: 'Slack #general', isPreconfigured: false, isDeprecated: false },
        { id: 'slack-2', name: 'Slack #alerts', isPreconfigured: false, isDeprecated: false },
      ],
    },
    '.jira': {
      instances: [
        { id: 'jira-1', name: 'Jira Project', isPreconfigured: false, isDeprecated: false },
      ],
    },
  },
  totalConnectors: 3,
};

describe('registerGetConnectorsTool', () => {
  let registeredTool: StaticToolRegistration<ZodObject<ZodRawShape>>;
  const mockApi = {
    getAvailableConnectors: jest.fn().mockResolvedValue(mockConnectorResponse),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    const agentBuilder = {
      tools: {
        register: jest.fn((tool: StaticToolRegistration<ZodObject<ZodRawShape>>) => {
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
    const result = await registeredTool.handler({} as any, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(3);
    expect(data.totalAvailable).toBe(3);
    expect(data.connectors).toHaveLength(3);
  });

  it('filters by connectorType', async () => {
    const result = await registeredTool.handler({ connectorType: '.slack' } as any, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(2);
    expect(data.connectors.every((c: any) => c.type === '.slack')).toBe(true);
  });

  it('filters by search term', async () => {
    const result = await registeredTool.handler({ search: 'alerts' } as any, context);
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    expect(data.connectors[0].name).toBe('Slack #alerts');
  });

  it('returns results in expected shape', async () => {
    const result = await registeredTool.handler({} as any, context);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    const data = result.results[0].data as any;
    for (const connector of data.connectors) {
      expect(connector).toHaveProperty('id');
      expect(connector).toHaveProperty('name');
      expect(connector).toHaveProperty('type');
    }
  });
});
