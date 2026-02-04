/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';

import { dataIncludeStepDefinition } from './data_include_step';
import type { StepHandlerContext } from '../../step_registry/types';

/** Parse YAML fields spec (valid YAML with colons; empty value = include as-is). */
const fields = (yaml: string): Record<string, unknown> =>
  parseYaml(yaml) as Record<string, unknown>;

const createMockContext = (
  config: { item: unknown },
  input: { fields: Record<string, unknown> }
): StepHandlerContext<any, any> => ({
  config,
  input,
  rawInput: input,
  contextManager: {
    renderInputTemplate: jest.fn((templateInput: unknown) => templateInput),
  } as any,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'data.include',
});

describe('dataIncludeStepDefinition', () => {
  describe('handler', () => {
    it('should include only specified top-level fields from objects', async () => {
      const config = {
        item: [
          { a: 5, b: 3, c: 6 },
          { a: 1, b: 2, c: 99 },
        ],
      };
      const input = {
        fields: fields(`
          a:
          b:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual([
        { a: 5, b: 3 },
        { a: 1, b: 2 },
      ]);
    });

    it('should apply pattern to each element when input is an array', async () => {
      const config = {
        item: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 },
        ],
      };
      const input = {
        fields: fields(`
          id:
          name:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should include nested fields when spec is nested', async () => {
      const config = {
        item: [
          {
            id: 1,
            name: 'Schedule A',
            schedule_layers: [
              {
                id: 'layer-1',
                name: 'Layer 1',
                start: '2024-01-01',
                extra: 'excluded',
                users: [{ user_name: 'u1', email: 'u1@example.com', internal_id: 'x' }],
              },
            ],
            users: [{ user_name: 'admin', email: 'admin@example.com' }],
          },
        ],
      };
      const input = {
        fields: fields(`
          id:
          name:
          schedule_layers:
            id:
            name:
            start:
            users:
              user_name:
              email:
          users:
            user_name:
            email:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual([
        {
          id: 1,
          name: 'Schedule A',
          schedule_layers: [
            {
              id: 'layer-1',
              name: 'Layer 1',
              start: '2024-01-01',
              users: [{ user_name: 'u1', email: 'u1@example.com' }],
            },
          ],
          users: [{ user_name: 'admin', email: 'admin@example.com' }],
        },
      ]);
    });

    it('should return single object when item is an object (not array)', async () => {
      const config = {
        item: { a: 5, b: 3, c: 6 },
      };
      const input = {
        fields: fields(`
          a:
          b:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual({ a: 5, b: 3 });
    });

    it('should project nested fields when item is an object', async () => {
      const config = {
        item: {
          id: 'x',
          name: 'Thing',
          meta: { source: 'api', version: 2, internal: 'excluded' },
          extra: 'dropped',
        },
      };
      const input = {
        fields: fields(`
          id:
          name:
          meta:
            source:
            version:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual({
        id: 'x',
        name: 'Thing',
        meta: { source: 'api', version: 2 },
      });
    });

    it('should include whole nested object when spec has no sub-fields for that key', async () => {
      const config = {
        item: { a: { b: 5, c: 6 }, d: 8 },
      };
      const input = {
        fields: fields(`
          a:
          d:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual({ a: { b: 5, c: 6 }, d: 8 });
    });

    it('should handle empty array', async () => {
      const config = { item: [] };
      const input = { fields: fields('id:') };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual([]);
    });

    it('should omit keys not in the spec', async () => {
      const config = {
        item: [{ id: 1, name: 'x', secret: 'do not include' }],
      };
      const input = {
        fields: fields(`
          id:
          name:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual([{ id: 1, name: 'x' }]);
      expect((result.output as any)[0]).not.toHaveProperty('secret');
    });

    it('should not add keys that are in spec but missing from source object', async () => {
      const config = {
        item: [{ id: 1 }],
      };
      const input = {
        fields: fields(`
          id:
          name:
        `),
      };

      const context = createMockContext(config, input);
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.output).toEqual([{ id: 1 }]);
      expect((result.output as any)[0]).not.toHaveProperty('name');
    });

    it('should error when item is null', async () => {
      const context = createMockContext({ item: null }, { fields: fields('id:') });
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Item cannot be null or undefined');
    });

    it('should error when item is undefined', async () => {
      const context = createMockContext({ item: undefined }, { fields: fields('id:') });
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Item cannot be null or undefined');
    });

    it('should error when item is a primitive', async () => {
      const context = createMockContext({ item: 'string' }, { fields: fields('id:') });
      const result = await dataIncludeStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Expected item to be an array or object');
    });

    it('should expose correct step definition id', () => {
      expect(dataIncludeStepDefinition.id).toBe('data.include');
    });
  });
});
