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
import { builtInStepDefinitions } from '@kbn/workflows';
import { registerGetStepDefinitionsTool } from './get_step_definitions_tool';

const mockGetAllConnectors = jest.fn();
const mockAddDynamicConnectorsToCache = jest.fn();
jest.mock('../../../common/schema', () => ({
  getAllConnectors: (...args: unknown[]) => mockGetAllConnectors(...args),
  addDynamicConnectorsToCache: (...args: unknown[]) => mockAddDynamicConnectorsToCache(...args),
  getCachedAllConnectorsMap: () => null,
}));

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetStepDefinitionsTool', () => {
  let registeredTool: BuiltinToolDefinition;
  const api = {
    getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
  } as any;

  beforeEach(async () => {
    const { z } = await import('@kbn/zod/v4');
    mockGetAllConnectors.mockReturnValue([
      {
        type: 'kibana.createCase',
        description: 'Create a case in Kibana',
        summary: 'Creates a case',
        paramsSchema: z.object({ title: z.string(), description: z.string().optional() }),
        outputSchema: z.object({ id: z.string() }),
        hasConnectorId: 'required',
        examples: {
          snippet: '- name: create\n  type: kibana.createCase\n  with:\n    title: "Test"',
        },
      },
      {
        type: 'http',
        description: 'Make an HTTP request',
        summary: 'HTTP connector',
        paramsSchema: z.object({ url: z.string(), method: z.string() }),
        outputSchema: z.object({ body: z.unknown() }),
        hasConnectorId: false,
      },
    ]);

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetStepDefinitionsTool(agentBuilder, api);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_step_definitions');
  });

  it('returns all step types without filters', async () => {
    const result = await invokeHandler(registeredTool, {}, { spaceId: 'default', request: {} });
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(data.stepTypes.length).toBe(data.count);
  });

  it('returns condensed results when many steps match', async () => {
    const result = await invokeHandler(registeredTool, {}, { spaceId: 'default', request: {} });
    const data = result.results[0].data as any;
    if (data.count > 5) {
      const first = data.stepTypes[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('label');
      expect(first).toHaveProperty('category');
      expect(first).not.toHaveProperty('inputParams');
      expect(first).not.toHaveProperty('stepSchema');
    }
  });

  it('returns separate inputParams and configParams in detailed results', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'if' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    const step = data.stepTypes[0];
    expect(step.id).toBe('if');
    expect(step).not.toHaveProperty('stepSchema');
    expect(step).toHaveProperty('configParams');
    const configNames = step.configParams.map((p: any) => p.name);
    expect(configNames).toContain('condition');
    expect(configNames).toContain('steps');
  });

  it('does not include common properties (name, type, if, timeout) in params', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'console' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    const allParamNames = [
      ...(step.inputParams ?? []).map((p: any) => p.name),
      ...(step.configParams ?? []).map((p: any) => p.name),
    ];
    expect(allParamNames).not.toContain('name');
    expect(allParamNames).not.toContain('type');
    expect(allParamNames).not.toContain('if');
    expect(allParamNames).not.toContain('timeout');
  });

  it('does not include outputSummary by default', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.stepTypes[0]).not.toHaveProperty('outputSchema');
    expect(data.stepTypes[0]).not.toHaveProperty('outputSummary');
  });

  it('includes outputSummary when includeOutputSummary is true', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase', includeOutputSummary: true },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.stepTypes[0]).not.toHaveProperty('outputSchema');
    expect(data.stepTypes[0]).toHaveProperty('outputSummary');
    expect(typeof data.stepTypes[0].outputSummary).toBe('string');
  });

  it('returns full schema when includeFullSchema is true', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'if', includeFullSchema: true },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).toHaveProperty('stepSchema');
    expect(step.stepSchema).toHaveProperty('properties');
    expect(step).not.toHaveProperty('outputSchema');
  });

  it('returns connector-id info for connector steps', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBe(1);
    const step = data.stepTypes[0];
    expect(step.connectorId).toBe('required');
  });

  it('returns input params for connector steps', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).toHaveProperty('inputParams');
    const inputNames = step.inputParams.map((p: any) => p.name);
    expect(inputNames).toContain('title');
  });

  it('omits connector-id when not needed', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'http' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).not.toHaveProperty('connectorId');
  });

  it('includes config fields for flow-control built-in steps', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'foreach' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const step = data.stepTypes[0];
    expect(step).toHaveProperty('configParams');
    const configNames = step.configParams.map((p: any) => p.name);
    expect(configNames).toContain('foreach');
    expect(configNames).toContain('steps');
  });

  it('filters by search term', async () => {
    const result = await invokeHandler(
      registeredTool,
      { search: 'case' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(
      data.stepTypes.every((s: any) => {
        const concat = `${s.id} ${s.label} ${s.description ?? ''}`.toLowerCase();
        return concat.includes('case');
      })
    ).toBe(true);
  });

  it('filters by category', async () => {
    const result = await invokeHandler(
      registeredTool,
      { category: 'flowControl' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const builtInFlowControl = builtInStepDefinitions.filter((s) => s.category === 'flowControl');
    expect(data.count).toBe(builtInFlowControl.length);
  });

  it('returns error for unknown step type', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'nonexistent_step' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.error).toContain('not found');
  });

  it('deduplicates built-in steps from connector list', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'http' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    const httpSteps = data.stepTypes.filter((s: any) => s.id === 'http');
    expect(httpSteps.length).toBeLessThanOrEqual(1);
  });

  it('returns results in expected shape', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'foreach' },
      { spaceId: 'default', request: {} }
    );
    expect(result).toHaveProperty('results');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0]).toHaveProperty('data');
  });

  it('includes examples from connector definitions', async () => {
    const result = await invokeHandler(
      registeredTool,
      { stepType: 'kibana.createCase' },
      { spaceId: 'default', request: {} }
    );
    const data = result.results[0].data as any;
    expect(data.stepTypes[0].examples).toBeDefined();
    expect(data.stepTypes[0].examples[0]).toContain('kibana.createCase');
  });
});
