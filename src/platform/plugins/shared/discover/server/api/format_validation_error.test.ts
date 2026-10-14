/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { discoverSessionApiDataSchema } from '@kbn/as-code-discover-schema';
import { formatValidationError } from './format_validation_error';

const formatIssues = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('Expected the input to be invalid');

  return formatValidationError(result.error.issues);
};

const objectOption = z.object({ kind: z.literal('object'), size: z.number() });
const namedOption = z.object({ kind: z.literal('named'), name: z.string() });

describe('formatValidationError', () => {
  it('lists what every option expected when they all reject the value itself', () => {
    expect(formatIssues(z.union([z.number(), z.literal('auto')]), true)).toBe(
      '✖ Invalid input: expected number or "auto"'
    );
  });

  it('lists the allowed discriminator values', () => {
    const schema = z.object({
      tabs: z.array(z.discriminatedUnion('kind', [objectOption, namedOption])),
    });

    expect(formatIssues(schema, { tabs: [{ kind: 'other' }] })).toBe(
      '✖ Invalid input: expected one of "object", "named"\n  → at tabs[0].kind'
    );
  });

  it('reports identical issues once alongside merged allowed values', () => {
    const schema = z.object({
      value: z.union([
        objectOption.extend({ id: z.string() }),
        namedOption.extend({ id: z.string() }),
      ]),
    });

    expect(formatIssues(schema, { value: { size: 1, name: 'x' } })).toBe(
      '✖ Invalid input: expected one of "object", "named"\n  → at value.kind\n' +
        '✖ Invalid input: expected string, received undefined\n  → at value.id'
    );
  });

  it('keeps the unresolved locations alongside an error shared by every format', () => {
    const schema = z.object({
      value: z.union([
        z.object({ id: z.string().max(100), size: z.number() }),
        z.object({ id: z.string().max(100), name: z.string().max(100) }),
      ]),
    });

    expect(formatIssues(schema, { value: {} })).toBe(
      '✖ Input does not match any supported format. Depending on the intended format, check: size, name\n  → at value\n' +
        '✖ Invalid input: expected string, received undefined\n  → at value.id'
    );
  });

  it('does not treat different constraints on the same field as a shared error', () => {
    const schema = z.union([
      z.object({ value: z.number().max(0) }),
      z.object({ value: z.number().min(10) }),
    ]);

    expect(formatIssues(schema, { value: 5 })).toBe(
      '✖ Input does not match any supported format. Depending on the intended format, check: value'
    );
  });

  it('deduplicates the unresolved locations across options', () => {
    const byId = z.object({ id: z.string().max(100) });
    const byQuery = z.object({ query: z.string().max(100) });
    const schema = z.union([
      byId,
      byQuery,
      z.object({ id: z.number() }),
      byQuery,
      byId,
      z.object({ name: z.string().max(100) }),
    ]);

    expect(formatIssues(schema, { id: true, query: true })).toBe(
      '✖ Input does not match any supported format. Depending on the intended format, check: id, query, name'
    );
  });

  it('includes unknown properties in the unresolved locations', () => {
    const schema = z.union([
      z.strictObject({ size: z.number() }),
      z.strictObject({ name: z.string().max(100) }),
    ]);

    expect(formatIssues(schema, { size: 1, name: 'logs' })).toBe(
      '✖ Input does not match any supported format. Depending on the intended format, check: name, size'
    );
  });

  it('reports a value that matches more than one exclusive option', () => {
    const schema = z.xor([z.object({ size: z.number() }), z.object({ size: z.number().int() })]);

    expect(formatIssues(schema, { size: 1 })).toBe(
      '✖ Invalid input: matches more than one allowed option (1, 2)'
    );
  });

  describe('Discover tab branches', () => {
    const formatTab = (tab: object) =>
      formatIssues(discoverSessionApiDataSchema, {
        title: 'Logs',
        tabs: [{ id: 'logs', label: 'Logs', ...tab }],
      });

    it('keeps every ES|QL error when the tab type defaults and other fields are invalid', () => {
      expect(formatTab({ id: undefined, data_source: { type: 'esql', query: 42, foo: 1 } })).toBe(
        '✖ Invalid input: expected string, received undefined\n  → at tabs[0].id\n' +
          '✖ Unrecognized key: "foo"\n  → at tabs[0].data_source\n' +
          '✖ Invalid input: expected string, received number\n  → at tabs[0].data_source.query'
      );
    });

    it('keeps Metrics requirements when the metrics discriminator matches', () => {
      expect(
        formatTab({
          type: 'metrics',
          data_source: { type: 'esql', query: 'FROM logs' },
          search_term: '',
          counter_aggregation: 'avg',
          gauge_aggregation: 'avg',
          histogram_percentile: 'p95',
        })
      ).toBe('✖ Invalid input: expected array, received undefined\n  → at tabs[0].dimensions');
    });

    it('does not select Metrics when the data source cannot be inspected', () => {
      expect(formatTab({ type: 'metrics', data_source: null })).toBe(
        '✖ Input does not match any supported format. Depending on the intended format, check: ' +
          'type, dimensions, search_term, counter_aggregation, gauge_aggregation, histogram_percentile\n  → at tabs[0]\n' +
          '✖ Invalid input: expected object, received null\n  → at tabs[0].data_source'
      );
    });

    it('lists allowed data sources when no branch recognizes the discriminator', () => {
      expect(formatTab({ type: 'default', data_source: { type: 'sql' } })).toBe(
        '✖ Invalid input: expected one of "data_view_reference", "data_view_spec", "esql"\n  → at tabs[0].data_source.type'
      );
    });

    it('keeps common errors but hides nested branch errors when discriminators conflict', () => {
      expect(
        formatTab({
          id: undefined,
          type: 'metrics',
          data_source: { type: 'data_view_reference', ref_id: 'logs' },
          filters: [
            {
              type: 'condition',
              condition: { field: 'extension', operator: 'is_one_of', value: ['css', 42, true] },
            },
          ],
        })
      ).toBe(
        '✖ No supported tab format matches the combination of type and data_source.type.\n  → at tabs[0]\n' +
          '✖ Invalid input: expected string, received undefined\n  → at tabs[0].id'
      );
    });
  });
});
