/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { clearEnrichmentCache, enrichErrorMessage } from './enrich_error_message';
import { clearDescriptionCache } from './zod_type_description';

describe('enrichErrorMessage', () => {
  beforeEach(() => {
    clearEnrichmentCache();
    clearDescriptionCache();
  });

  describe('large workflow `steps` array element', () => {
    function buildWorkflowSchema(connectorCount: number) {
      const stepSchema: z.ZodType = z.lazy(() =>
        z.discriminatedUnion(
          'type',
          Array.from({ length: connectorCount }, (_, i) =>
            z.object({
              type: z.literal(`conn.${i}`),
              with: z.object({ message: z.string().optional() }).optional(),
              'on-failure': z
                .object({
                  fallback: z.array(stepSchema),
                })
                .optional(),
            })
          ) as unknown as [z.ZodObject, z.ZodObject, ...z.ZodObject[]]
        )
      );

      return z.object({
        version: z.literal('1'),
        triggers: z.array(z.object({ type: z.string() })),
        steps: z.array(stepSchema).min(1),
      });
    }

    it('enriches a malformed-steps marker quickly and with a bounded message', () => {
      const schema = buildWorkflowSchema(200);

      const start = Date.now();
      const result = enrichErrorMessage(['steps'], 'Incorrect type. Expected "array".', 'unknown', {
        schema,
      });
      const elapsed = Date.now() - start;

      expect(result.enriched).toBe(true);
      expect(result.message.toLowerCase()).toContain('steps');
      expect(elapsed).toBeLessThan(500);
      expect(result.message.length).toBeLessThan(20_000);
    });

    it('caps the rendered union options for very large discriminated unions', () => {
      const schema = buildWorkflowSchema(200);

      const { message } = enrichErrorMessage(
        ['steps'],
        'Incorrect type. Expected "array".',
        'unknown',
        { schema }
      );

      expect(message).toMatch(/\.\.\. and \d+ more/);
      const renderedConnectorTypes = (message.match(/type: "conn\.\d+"/g) ?? []).length;
      expect(renderedConnectorTypes).toBeLessThanOrEqual(10);
    });

    it('stays cheap across many markers (cache hits)', () => {
      const schema = buildWorkflowSchema(200);
      enrichErrorMessage(['steps'], 'Incorrect type. Expected "array".', 'unknown', { schema });

      const start = Date.now();
      // Vary the path so `enrichmentCache` always misses and we re-exercise
      // `tryWorkflowSchemaEnrichment`.
      for (let i = 0; i < 50; i++) {
        enrichErrorMessage(['steps', i], `Incorrect type. Expected "array". (#${i})`, 'unknown', {
          schema,
        });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('domain-specific shortcuts', () => {
    it('short-circuits invalid_type at top-level steps with the friendly hint', () => {
      const schema = z.object({
        steps: z.array(z.object({ type: z.string() })).min(1),
      });
      const result = enrichErrorMessage(['steps'], 'Expected array', 'invalid_type', { schema });
      expect(result.enriched).toBe(true);
      expect(result.message).toContain('No steps found');
    });
  });
});
