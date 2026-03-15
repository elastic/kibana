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
import { builtInTriggerDefinitions } from '@kbn/workflows';
import { registerGetTriggerDefinitionsTool } from './get_trigger_definitions_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetTriggerDefinitionsTool', () => {
  let registeredTool: BuiltinToolDefinition;

  beforeEach(() => {
    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetTriggerDefinitionsTool(agentBuilder);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_trigger_definitions');
  });

  it('returns all trigger types without filter', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    const data = result.results[0].data as any;
    expect(data.count).toBe(builtInTriggerDefinitions.length);
    expect(data.triggerTypes.length).toBe(builtInTriggerDefinitions.length);
  });

  it('returns jsonSchema and examples for each trigger', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    const data = result.results[0].data as any;
    for (const trigger of data.triggerTypes) {
      expect(trigger).toHaveProperty('id');
      expect(trigger).toHaveProperty('label');
      expect(trigger).toHaveProperty('description');
      expect(trigger).toHaveProperty('jsonSchema');
      expect(trigger).toHaveProperty('examples');
      expect(trigger.examples.length).toBeGreaterThan(0);
    }
  });

  it('filters by triggerType', async () => {
    const result = await invokeHandler(registeredTool, { triggerType: 'scheduled' }, {});
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    expect(data.triggerTypes[0].id).toBe('scheduled');
  });

  it('returns error for unknown trigger type', async () => {
    const result = await invokeHandler(registeredTool, { triggerType: 'nonexistent' }, {});
    const data = result.results[0].data as any;
    expect(data.error).toContain('not found');
    expect(data.availableTypes).toContain('manual');
  });

  it('returns results in expected shape', async () => {
    const result = await invokeHandler(registeredTool, {}, {});
    expect(result).toHaveProperty('results');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0]).toHaveProperty('data');
  });
});
