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
import { registerGetStepDefinitionsTool } from './get_step_definitions_tool';
import { stepSchemas } from '../../../common/step_schemas';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('get_step_definitions dynamic connector types', () => {
  it('returns the http step when action type ".http" is available', async () => {
    stepSchemas.setAllConnectorsCache(null);
    stepSchemas.setAllConnectorsMapCache(null);
    stepSchemas.setDynamicConnectorTypesCache(null);
    stepSchemas.setLastProcessedConnectorTypesHash(null);

    let registeredTool: BuiltinToolDefinition | undefined;

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    const api = {
      getAvailableConnectors: jest.fn().mockResolvedValue({
        connectorsByType: {
          '.http': {
            actionTypeId: '.http',
            displayName: 'HTTP',
            instances: [],
            enabled: true,
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
          },
        },
        totalConnectors: 0,
      }),
    } as any;

    registerGetStepDefinitionsTool(agentBuilder, api);

    if (!registeredTool) {
      throw new Error('Tool was not registered');
    }

    const result = await invokeHandler(
      registeredTool,
      { stepType: 'http' },
      { spaceId: 'default', request: {} }
    );

    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    expect(data.stepTypes[0].id).toBe('http');
    expect(data.stepTypes[0].connectorId).toBe('optional');
  });
});
