/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorContractUnion } from '../..';
import { generateYamlSchemaFromConnectors } from '../..';

const BASE_WORKFLOW = {
  name: 'test',
  triggers: [{ type: 'manual' }],
};

// Failing: See https://github.com/elastic/kibana/issues/271451
describe.skip('generateYamlSchemaFromConnectors', () => {
  describe('strict mode', () => {
    it('should generate a valid YAML schema from connectors', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          summary: 'Console',
          description: 'Console',
          type: 'console',
          paramsSchema: z.object({
            message: z.string(),
          }),
          outputSchema: z.object({
            message: z.string(),
          }),
        },
      ];
      const schema = generateYamlSchemaFromConnectors(connectors);
      expect(schema).toBeDefined();
      // strict mode should throw if required fields are missing
      expect(() =>
        schema.parse({
          steps: [],
        })
      ).toThrow();
    });
  });

  describe('with field optionality', () => {
    it('does not require `with` for a step whose paramsSchema has no fields', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          summary: 'No-input step',
          description: null,
          type: 'data.parseJson',
          paramsSchema: z.object({}),
          outputSchema: z.unknown(),
        },
      ];
      const schema = generateYamlSchemaFromConnectors(connectors);
      // Should parse fine without `with`
      expect(() =>
        schema.parse({
          ...BASE_WORKFLOW,
          steps: [{ name: 'parse', type: 'data.parseJson' }],
        })
      ).not.toThrow();
    });

    it('does not require `with` for a step whose paramsSchema has only optional fields', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          summary: 'All-optional step',
          description: null,
          type: 'my.step',
          paramsSchema: z.object({ message: z.string().optional() }),
          outputSchema: z.unknown(),
        },
      ];
      const schema = generateYamlSchemaFromConnectors(connectors);
      expect(() =>
        schema.parse({
          ...BASE_WORKFLOW,
          steps: [{ name: 'step', type: 'my.step' }],
        })
      ).not.toThrow();
    });

    it('requires `with` for a step that has required params', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          summary: 'Required-input step',
          description: null,
          type: 'my.requiredStep',
          paramsSchema: z.object({ message: z.string() }),
          outputSchema: z.unknown(),
        },
      ];
      const schema = generateYamlSchemaFromConnectors(connectors);
      expect(() =>
        schema.parse({
          ...BASE_WORKFLOW,
          steps: [{ name: 'step', type: 'my.requiredStep' }],
        })
      ).toThrow();
    });
  });

  describe('lazy step union memoization', () => {
    it('returns the same discriminated union instance across visits', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          summary: 'A',
          description: null,
          type: 'a.step',
          paramsSchema: z.object({}),
          outputSchema: z.unknown(),
        },
        {
          summary: 'B',
          description: null,
          type: 'b.step',
          paramsSchema: z.object({}),
          outputSchema: z.unknown(),
        },
      ];

      const schema = generateYamlSchemaFromConnectors(connectors) as z.ZodObject;
      const stepsArray = schema.shape.steps as z.ZodArray<z.ZodLazy<z.ZodType>>;
      const lazy = stepsArray.def.element as z.ZodLazy<z.ZodType>;
      const getter = (lazy as unknown as { _def: { getter: () => z.ZodType } })._def.getter;

      const first = getter();
      const second = getter();
      // Required for `z.toJSONSchema({ reused: 'ref' })` to dedupe via `$ref`.
      expect(first).toBe(second);
    });

    it('rejects a malformed `steps` mapping quickly', () => {
      const connectors: ConnectorContractUnion[] = Array.from({ length: 40 }, (_, i) => ({
        summary: `Connector ${i}`,
        description: null,
        type: `conn.${i}`,
        paramsSchema: z.object({ message: z.string().optional() }),
        outputSchema: z.unknown(),
      }));

      const schema = generateYamlSchemaFromConnectors(connectors);

      // Shape produced by pasting steps without a leading dash: `steps`
      // becomes a map instead of an array.
      const start = Date.now();
      const result = schema.safeParse({
        ...BASE_WORKFLOW,
        steps: { name: 'filter_results', type: 'conn.0' },
      });
      const elapsed = Date.now() - start;

      expect(result.success).toBe(false);
      expect(elapsed).toBeLessThan(500);
    });
  });
});
