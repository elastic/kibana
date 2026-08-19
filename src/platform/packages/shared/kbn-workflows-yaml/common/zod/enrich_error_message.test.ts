/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'perf_hooks';
import { z } from '@kbn/zod/v4';
import { clearEnrichmentCache, enrichErrorMessage } from './enrich_error_message';
import { clearDescriptionCache } from './zod_type_description';

describe('enrichErrorMessage', () => {
  beforeEach(() => {
    clearEnrichmentCache();
    clearDescriptionCache();
  });

  describe('constraint violations preserve the original message', () => {
    const schema = z.object({
      concurrency: z.object({
        max: z.number().int().positive().max(20, 'Parallel concurrency "max" cannot exceed 20.'),
      }),
    });

    it('keeps the author-written too_big message instead of describing the type', () => {
      // Regression: a `too_big` constraint message must survive schema-aware
      // enrichment, which previously rewrote it to "max expects number".
      const result = enrichErrorMessage(
        ['concurrency', 'max'],
        'Parallel concurrency "max" cannot exceed 20.',
        'too_big',
        { schema }
      );
      expect(result.message).toContain('cannot exceed 20');
      expect(result.message).not.toContain('expects number');
    });

    it('still describes the type for an invalid_type mismatch at the same path', () => {
      const result = enrichErrorMessage(
        ['concurrency', 'max'],
        'Invalid input: expected number, received string',
        'invalid_type',
        { schema }
      );
      expect(result.message).toContain('max expects');
    });

    it('keeps a custom refinement message attached at a step node', () => {
      // Regression: a `custom` refinement (e.g. the parallel-mode mutual-
      // exclusivity rule) attaches at the step node, so its path points at the
      // step-union. Schema-aware enrichment would otherwise replace the friendly
      // message with the giant "must be one of ...N more" union dump.
      const unionSchema = z.object({
        steps: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('parallel'), name: z.string() }),
            z.object({ type: z.literal('console'), name: z.string() }),
          ])
        ),
      });
      const friendlyMessage =
        'A "parallel" step must use either dynamic fan-out (`foreach` + `steps`) or static `branches`, but not both.';

      const result = enrichErrorMessage(['steps', 0], friendlyMessage, 'custom', {
        schema: unionSchema,
      });

      expect(result.message).toContain('must use either dynamic fan-out');
      expect(result.message).not.toContain('must be one of');
    });
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

    it('keeps per-marker enrichment cost bounded across many markers', () => {
      const schema = buildWorkflowSchema(200);

      // Prime both the description cache and the JIT before measuring so the
      // baseline reflects steady-state cost rather than first-call overhead.
      for (let i = 0; i < 3; i++) {
        enrichErrorMessage(['steps', 1000 + i], `# warm ${i}`, 'unknown', { schema });
      }

      // Calibrate per-call cost on the current machine. The loop below should
      // stay close to `iterations * baselineMs` once caches are warm.
      const baselineStart = performance.now();
      enrichErrorMessage(['steps', 2000], 'baseline.', 'unknown', { schema });
      const baselineMs = Math.max(0.1, performance.now() - baselineStart);

      const iterations = 50;
      const start = performance.now();
      // Vary the path so `enrichmentCache` always misses and we re-exercise
      // `tryWorkflowSchemaEnrichment`.
      for (let i = 0; i < iterations; i++) {
        enrichErrorMessage(['steps', i], `Incorrect type. Expected "array". (#${i})`, 'unknown', {
          schema,
        });
      }
      const elapsed = performance.now() - start;
      const perIterMs = elapsed / iterations;

      // Per-iteration cost should not exceed the calibrated baseline by more
      // than a generous noise multiplier. Using a relative bound (with a small
      // absolute floor) keeps the assertion stable on noisy CI agents while
      // still catching a regression that would inflate per-iter cost.
      const perIterCeiling = Math.max(baselineMs * 5, 50);
      expect(perIterMs).toBeLessThan(perIterCeiling);
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
