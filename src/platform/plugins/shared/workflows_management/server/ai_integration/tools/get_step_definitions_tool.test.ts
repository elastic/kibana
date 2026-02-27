/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { builtInStepDefinitions } from '@kbn/workflows';
import {
  GET_STEP_DEFINITIONS_TOOL_ID,
  registerGetStepDefinitionsTool,
} from './get_step_definitions_tool';
import type { AgentBuilderPluginSetupContract } from '../../types';

jest.mock('../../../common/schema', () => {
  const { z } = jest.requireActual('@kbn/zod/v4');
  return {
    getAllConnectors: jest.fn(() => [
      {
        type: 'console',
        summary: 'Console',
        paramsSchema: z.object({ message: z.string() }),
        outputSchema: z.string(),
        description: 'Log a message to the workflow logs',
      },
      {
        type: 'kibana.createCase',
        summary: 'Create a case',
        paramsSchema: z.object({ title: z.string(), description: z.string() }),
        outputSchema: z.any(),
        description: 'Create a Kibana case',
      },
    ]),
  };
});

describe('get_step_definitions_tool', () => {
  let handler: (
    params: unknown,
    context: unknown
  ) => Promise<{ results: Array<{ type: string; data: unknown }> }>;

  beforeAll(() => {
    const mockRegister = jest.fn();
    const agentBuilder = {
      agents: { register: jest.fn() },
      tools: { register: mockRegister },
      attachments: { registerType: jest.fn() },
      hooks: { register: jest.fn() },
      skills: { register: jest.fn() },
    } as unknown as AgentBuilderPluginSetupContract;

    registerGetStepDefinitionsTool(agentBuilder);

    const registration = mockRegister.mock.calls[0][0];
    expect(registration.id).toBe(GET_STEP_DEFINITIONS_TOOL_ID);
    handler = registration.handler;
  });

  const getData = (result: { results: Array<{ type: string; data: unknown }> }) =>
    result.results[0].data as Record<string, unknown>;

  const getStepTypes = (result: { results: Array<{ type: string; data: unknown }> }) =>
    (getData(result) as { stepTypes: Array<Record<string, unknown>> }).stepTypes;

  describe('built-in step types', () => {
    const expectedBuiltInTypes = ['if', 'foreach', 'wait', 'http', 'parallel', 'merge', 'data.set'];

    it('includes all built-in step types when called without filters', async () => {
      const result = await handler({}, {});
      const stepTypes = getStepTypes(result);

      for (const type of expectedBuiltInTypes) {
        const found = stepTypes.find((s) => s.id === type);
        expect(found).toBeDefined();
      }
    });

    it.each(builtInStepDefinitions)(
      'returns detailed info for built-in step "$type"',
      async (stepDef) => {
        const result = await handler({ stepType: stepDef.type }, {});
        const data = getData(result) as {
          count: number;
          stepTypes: Array<Record<string, unknown>>;
        };

        expect(data.count).toBe(1);

        const step = data.stepTypes[0];
        expect(step.id).toBe(stepDef.type);
        expect(step.category).toBe(stepDef.category);
        expect(step.label).toBeTruthy();
        expect(step.jsonSchema).toBeDefined();
        expect(step.example).toBeTruthy();
      }
    );

    it('derives description from Zod schema type field for "if"', async () => {
      const result = await handler({ stepType: 'if' }, {});
      const step = getStepTypes(result)[0];

      expect(step.label).toContain('Conditional');
    });

    it('derives description from Zod schema type field for "foreach"', async () => {
      const result = await handler({ stepType: 'foreach' }, {});
      const step = getStepTypes(result)[0];

      expect(step.label).toContain('Loop');
    });

    it('derives description from Zod schema type field for "http"', async () => {
      const result = await handler({ stepType: 'http' }, {});
      const step = getStepTypes(result)[0];

      expect(step.label).toContain('HTTP');
    });

    it('returns JSON Schema with properties for "http" step', async () => {
      const result = await handler({ stepType: 'http' }, {});
      const step = getStepTypes(result)[0];
      const jsonSchema = step.jsonSchema as Record<string, unknown>;

      expect(jsonSchema).toBeDefined();
      const props = resolveProperties(jsonSchema);
      expect(props).toBeDefined();
      expect(props.with).toBeDefined();
    });

    it('returns JSON Schema with properties for "foreach" step', async () => {
      const result = await handler({ stepType: 'foreach' }, {});
      const step = getStepTypes(result)[0];
      const jsonSchema = step.jsonSchema as Record<string, unknown>;

      const props = resolveProperties(jsonSchema);
      expect(props.foreach).toBeDefined();
      expect(props.steps).toBeDefined();
    });

    it('returns JSON Schema with properties for "if" step', async () => {
      const result = await handler({ stepType: 'if' }, {});
      const step = getStepTypes(result)[0];
      const jsonSchema = step.jsonSchema as Record<string, unknown>;

      const props = resolveProperties(jsonSchema);
      expect(props.condition).toBeDefined();
      expect(props.steps).toBeDefined();
    });

    it.each(builtInStepDefinitions)('JSON Schema for "$type" stays under 3 KB', async (stepDef) => {
      const result = await handler({ stepType: stepDef.type }, {});
      const step = getStepTypes(result)[0];
      const serialized = JSON.stringify(step.jsonSchema);
      const sizeBytes = Buffer.byteLength(serialized, 'utf-8');

      expect(sizeBytes).toBeLessThan(3 * 1024);
    });
  });

  describe('search parameter', () => {
    it('finds built-in steps by keyword in description', async () => {
      const result = await handler({ search: 'conditional' }, {});
      const stepTypes = getStepTypes(result);

      expect(stepTypes.some((s) => s.id === 'if')).toBe(true);
    });

    it('finds built-in steps by type name', async () => {
      const result = await handler({ search: 'foreach' }, {});
      const stepTypes = getStepTypes(result);

      expect(stepTypes.some((s) => s.id === 'foreach')).toBe(true);
    });

    it('finds connector steps by keyword', async () => {
      const result = await handler({ search: 'case' }, {});
      const stepTypes = getStepTypes(result);

      expect(stepTypes.some((s) => s.id === 'kibana.createCase')).toBe(true);
    });

    it('includes searchTerm in response', async () => {
      const result = await handler({ search: 'http' }, {});
      const data = getData(result);

      expect(data.searchTerm).toBe('http');
    });

    it('returns error with hint for non-existent exact stepType', async () => {
      const result = await handler({ stepType: 'nonexistent' }, {});
      const data = getData(result);

      expect(data.error).toContain('not found');
      expect(data.hint).toBeTruthy();
    });

    it('returns suggestions when stepType partially matches', async () => {
      const result = await handler({ stepType: 'kibana' }, {});
      const data = getData(result) as {
        error: string;
        suggestions?: Array<{ id: string }>;
      };

      expect(data.error).toContain('not found');
      expect(data.suggestions).toBeDefined();
      expect(data.suggestions!.some((s) => s.id === 'kibana.createCase')).toBe(true);
    });

    it('returns error for search with no matches', async () => {
      const result = await handler({ search: 'zzzzzzzzz' }, {});
      const data = getData(result);

      expect(data.error).toContain('No step types found');
    });
  });

  describe('detail level', () => {
    it('includes jsonSchema and example when results <= 5', async () => {
      const result = await handler({ search: 'parallel' }, {});
      const stepTypes = getStepTypes(result);

      expect(stepTypes.length).toBeLessThanOrEqual(5);
      for (const step of stepTypes) {
        expect(step.example).toBeTruthy();
      }
    });

    it('omits jsonSchema and example when results > 5', async () => {
      const result = await handler({}, {});
      const data = getData(result) as { count: number; stepTypes: Array<Record<string, unknown>> };

      expect(data.count).toBeGreaterThan(5);
      for (const step of data.stepTypes) {
        expect(step).not.toHaveProperty('jsonSchema');
        expect(step).not.toHaveProperty('example');
      }
    });
  });
});

function resolveProperties(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.properties) {
    return schema.properties as Record<string, unknown>;
  }
  if (schema.$ref && schema.$defs) {
    const refName = (schema.$ref as string).replace('#/$defs/', '');
    const def = (schema.$defs as Record<string, Record<string, unknown>>)[refName];
    if (def?.properties) {
      return def.properties as Record<string, unknown>;
    }
  }
  return {};
}
