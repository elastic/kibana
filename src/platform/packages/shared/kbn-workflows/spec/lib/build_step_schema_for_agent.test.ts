/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import {
  buildBuiltInStepSchema,
  buildConnectorStepSchema,
  buildOutputSummary,
  buildStepParamsSummary,
} from './build_step_schema_for_agent';
import { getShape } from '../../common/utils/zod/get_shape';
import type { BaseConnectorContract } from '../../types/v1';
import type { BaseStepDefinition } from '../step_definition_types';
import { StepCategory } from '../step_definition_types';

const makeConnector = (overrides: Partial<BaseConnectorContract> = {}): BaseConnectorContract => ({
  type: 'test.connector',
  paramsSchema: z.object({ index: z.string() }),
  outputSchema: z.object({}),
  summary: 'Test connector',
  description: 'A test connector',
  ...overrides,
});

const makeBuiltInStep = (overrides: Partial<BaseStepDefinition> = {}): BaseStepDefinition => ({
  id: 'test.step',
  label: 'Test Step',
  description: 'A test step',
  category: StepCategory.Data,
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({}),
  ...overrides,
});

describe('build_step_schema_for_agent', () => {
  describe('buildConnectorStepSchema', () => {
    it('includes base props: name, type, with, if, timeout', () => {
      const schema = buildConnectorStepSchema(makeConnector());
      const shape = getShape(schema);

      expect(shape).toHaveProperty('name');
      expect(shape).toHaveProperty('type');
      expect(shape).toHaveProperty('with');
      expect(shape).toHaveProperty('if');
      expect(shape).toHaveProperty('timeout');
    });

    it('adds required connector-id when hasConnectorId is "required"', () => {
      const schema = buildConnectorStepSchema(makeConnector({ hasConnectorId: 'required' }));
      const shape = getShape(schema);

      expect(shape).toHaveProperty('connector-id');
    });

    it('adds optional connector-id when hasConnectorId is "optional"', () => {
      const schema = buildConnectorStepSchema(makeConnector({ hasConnectorId: 'optional' }));
      const shape = getShape(schema);

      expect(shape).toHaveProperty('connector-id');
    });

    it('omits connector-id when hasConnectorId is false', () => {
      const schema = buildConnectorStepSchema(makeConnector({ hasConnectorId: false }));
      const shape = getShape(schema);

      expect(shape).not.toHaveProperty('connector-id');
    });

    it('omits connector-id when hasConnectorId is undefined', () => {
      const schema = buildConnectorStepSchema(makeConnector({ hasConnectorId: undefined }));
      const shape = getShape(schema);

      expect(shape).not.toHaveProperty('connector-id');
    });

    it('merges configSchema properties into output shape', () => {
      const schema = buildConnectorStepSchema(
        makeConnector({
          configSchema: z.object({ retries: z.number() }),
        })
      );
      const shape = getShape(schema);

      expect(shape).toHaveProperty('retries');
    });

    it('does not merge empty configSchema', () => {
      const schema = buildConnectorStepSchema(
        makeConnector({
          configSchema: z.object({}),
        })
      );
      const shape = getShape(schema);
      const shapeKeys = Object.keys(shape);

      // Should only have the base props, not extra config keys
      expect(shapeKeys).not.toContain('retries');
    });

    it('handles undefined configSchema without crashing', () => {
      expect(() =>
        buildConnectorStepSchema(makeConnector({ configSchema: undefined }))
      ).not.toThrow();
    });

    it('does not annotate type literal when description is empty string', () => {
      const schema = buildConnectorStepSchema(makeConnector({ description: '' }));
      // Should not throw and should produce a valid schema
      expect(getShape(schema)).toHaveProperty('type');
    });

    it('annotates type literal when description is provided', () => {
      const schema = buildConnectorStepSchema(makeConnector({ description: 'My connector' }));
      expect(getShape(schema)).toHaveProperty('type');
    });
  });

  describe('buildBuiltInStepSchema', () => {
    it('includes name and type for any step', () => {
      const schema = buildBuiltInStepSchema(makeBuiltInStep());
      const shape = getShape(schema);

      expect(shape).toHaveProperty('name');
      expect(shape).toHaveProperty('type');
    });

    it('includes if and timeout for non-FlowControl steps', () => {
      const schema = buildBuiltInStepSchema(makeBuiltInStep({ category: StepCategory.Data }));
      const shape = getShape(schema);

      expect(shape).toHaveProperty('if');
      expect(shape).toHaveProperty('timeout');
    });

    it('omits if and timeout for FlowControl steps', () => {
      const schema = buildBuiltInStepSchema(
        makeBuiltInStep({ category: StepCategory.FlowControl })
      );
      const shape = getShape(schema);

      expect(shape).not.toHaveProperty('if');
      expect(shape).not.toHaveProperty('timeout');
    });

    it('includes with when inputSchema has keys', () => {
      const schema = buildBuiltInStepSchema(
        makeBuiltInStep({ inputSchema: z.object({ x: z.string() }) })
      );
      const shape = getShape(schema);

      expect(shape).toHaveProperty('with');
    });

    it('omits with when inputSchema is empty', () => {
      const schema = buildBuiltInStepSchema(makeBuiltInStep({ inputSchema: z.object({}) }));
      const shape = getShape(schema);

      expect(shape).not.toHaveProperty('with');
    });

    it('merges configSchema properties at top level', () => {
      const schema = buildBuiltInStepSchema(
        makeBuiltInStep({ configSchema: z.object({ condition: z.string() }) })
      );
      const shape = getShape(schema);

      expect(shape).toHaveProperty('condition');
    });

    it('does not merge empty configSchema', () => {
      const schema = buildBuiltInStepSchema(makeBuiltInStep({ configSchema: z.object({}) }));
      const shape = getShape(schema);
      // Should only have base props + with (from non-empty inputSchema)
      expect(shape).not.toHaveProperty('condition');
    });
  });

  describe('buildStepParamsSummary', () => {
    it('marks required fields correctly', () => {
      const result = buildStepParamsSummary(z.object({ name: z.string() }));
      expect(result).toEqual([
        expect.objectContaining({ name: 'name', type: 'string', required: true }),
      ]);
    });

    it('marks optional fields correctly', () => {
      const result = buildStepParamsSummary(z.object({ opt: z.string().optional() }));
      expect(result).toEqual([expect.objectContaining({ name: 'opt', required: false })]);
    });

    it('treats nullable as required (not optional)', () => {
      const result = buildStepParamsSummary(z.object({ val: z.number().nullable() }));
      expect(result).toEqual([expect.objectContaining({ name: 'val', required: true })]);
    });

    it('treats default as optional', () => {
      const result = buildStepParamsSummary(z.object({ val: z.string().default('foo') }));
      expect(result).toEqual([expect.objectContaining({ name: 'val', required: false })]);
    });

    it('unwraps deeply nested wrappers', () => {
      const result = buildStepParamsSummary(
        z.object({ val: z.string().optional().nullable().default('x') })
      );
      expect(result).toEqual([expect.objectContaining({ name: 'val', required: false })]);
    });

    it('describes various schema types correctly', () => {
      const schema = z.object({
        s: z.string(),
        n: z.number(),
        b: z.boolean(),
        a: z.array(z.string()),
        o: z.object({}),
      });
      const result = buildStepParamsSummary(schema);
      const typeMap = Object.fromEntries(result.map((r) => [r.name, r.type]));

      expect(typeMap.s).toBe('string');
      expect(typeMap.n).toBe('number');
      expect(typeMap.b).toBe('boolean');
      expect(typeMap.a).toBe('array');
      expect(typeMap.o).toBe('object');
    });

    it('describes literal type', () => {
      const result = buildStepParamsSummary(z.object({ lit: z.literal('value') }));
      expect(result[0].type).toContain('literal');
    });

    it('describes enum type', () => {
      const result = buildStepParamsSummary(z.object({ e: z.enum(['a', 'b']) }));
      expect(result[0].type).toBe('enum(a,b)');
    });

    it('describes union with mixed types', () => {
      const result = buildStepParamsSummary(z.object({ u: z.union([z.string(), z.number()]) }));
      expect(result[0].type).toBe('string | number');
    });

    it('deduplicates union of same types', () => {
      const result = buildStepParamsSummary(z.object({ u: z.union([z.string(), z.string()]) }));
      expect(result[0].type).toBe('string');
    });

    it('describes record as object', () => {
      const result = buildStepParamsSummary(z.object({ r: z.record(z.string(), z.unknown()) }));
      expect(result[0].type).toBe('object');
    });

    it('describes int as number', () => {
      const result = buildStepParamsSummary(z.object({ i: z.int() }));
      expect(result[0].type).toBe('number');
    });

    it('truncates descriptions longer than 120 chars', () => {
      const longDesc = 'a'.repeat(150);
      const result = buildStepParamsSummary(z.object({ f: z.string().describe(longDesc) }));
      expect(result[0].description).toBe(`${'a'.repeat(120)}...`);
    });

    it('does not truncate description of exactly 120 chars', () => {
      const desc = 'a'.repeat(120);
      const result = buildStepParamsSummary(z.object({ f: z.string().describe(desc) }));
      expect(result[0].description).toBe(desc);
    });

    it('omits description key when not present', () => {
      const result = buildStepParamsSummary(z.object({ f: z.string() }));
      expect(result[0]).not.toHaveProperty('description');
    });
  });

  describe('buildOutputSummary', () => {
    it('describes object with fields', () => {
      const result = buildOutputSummary(z.object({ took: z.number(), errors: z.boolean() }));
      expect(result).toBe('object with: took (number), errors (boolean)');
    });

    it('describes empty object', () => {
      expect(buildOutputSummary(z.object({}))).toBe('object');
    });

    it('does not add suffix for exactly 12 fields', () => {
      const fields: Record<string, z.ZodType> = {};
      for (let i = 0; i < 12; i++) {
        fields[`f${i}`] = z.string();
      }
      const result = buildOutputSummary(z.object(fields));
      expect(result).not.toContain('more');
    });

    it('adds suffix for 13 fields', () => {
      const fields: Record<string, z.ZodType> = {};
      for (let i = 0; i < 13; i++) {
        fields[`f${i}`] = z.string();
      }
      const result = buildOutputSummary(z.object(fields));
      expect(result).toContain('+1 more');
    });

    it('describes array type', () => {
      expect(buildOutputSummary(z.array(z.string()))).toBe('array');
    });

    it('describes string type', () => {
      expect(buildOutputSummary(z.string())).toBe('string');
    });

    it('unwraps optional wrapper', () => {
      expect(buildOutputSummary(z.string().optional())).toBe('string');
    });
  });
});
