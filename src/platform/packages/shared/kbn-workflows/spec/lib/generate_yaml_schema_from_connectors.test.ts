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

const consoleConnector: ConnectorContractUnion = {
  summary: 'Console',
  description: 'Console',
  type: 'console',
  paramsSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
};

const minimalWorkflow = (steps: unknown[]) => ({
  name: 'test',
  triggers: [{ type: 'manual' }],
  steps,
});

describe('generateYamlSchemaFromConnectors', () => {
  describe('strict mode', () => {
    it('should generate a valid YAML schema from connectors', () => {
      const schema = generateYamlSchemaFromConnectors([consoleConnector]);
      expect(schema).toBeDefined();
      // strict mode should throw if required fields are missing
      expect(() =>
        schema.parse({
          steps: [],
        })
      ).toThrow();
    });

    it('rejects step types that are not in the discriminated union', () => {
      const schema = generateYamlSchemaFromConnectors([consoleConnector]);
      const result = schema.safeParse(
        minimalWorkflow([{ name: 'call-http', type: 'http', with: { url: 'https://e.co' } }])
      );
      expect(result.success).toBe(false);
    });
  });

  describe('loose mode', () => {
    it('accepts unknown step types via the passthrough fallback', () => {
      // Loose mode is used at built-in workflow registration time, before
      // stack-connector action types are discoverable via the actions
      // client. A reference to such a connector (here: `http`) must not
      // mark the workflow as invalid.
      const schema = generateYamlSchemaFromConnectors([consoleConnector], [], true);
      const result = schema.safeParse(
        minimalWorkflow([
          {
            name: 'call-http',
            type: 'http',
            with: { url: 'https://example.com', method: 'GET' },
          },
        ])
      );
      expect(result.success).toBe(true);
    });

    it('still rejects steps that are missing the required `name` / `type`', () => {
      const schema = generateYamlSchemaFromConnectors([consoleConnector], [], true);
      const result = schema.safeParse(minimalWorkflow([{ with: { foo: 'bar' } }]));
      expect(result.success).toBe(false);
    });

    it('still validates known step types against their connector schema', () => {
      const schema = generateYamlSchemaFromConnectors([consoleConnector], [], true);
      // `console` is in the discriminated union, so its `with.message` is
      // checked first. The fallback only kicks in for unknown discriminator
      // values, so a known-but-malformed step still parses (via the
      // permissive fallback) — loose mode intentionally does not enforce
      // connector params.
      const result = schema.safeParse(
        minimalWorkflow([{ name: 'log', type: 'console', with: { message: 'hi' } }])
      );
      expect(result.success).toBe(true);
    });
  });
});
