/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { formatValidationError } from './format_validation_error';

const formatIssues = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('Expected the input to be invalid');

  return formatValidationError(result.error.issues);
};

const objectOption = z.object({ kind: z.literal('object'), size: z.number() });
const namedOption = z.object({ kind: z.literal('named'), name: z.string() });

describe('formatValidationError', () => {
  it('lists the allowed discriminator values', () => {
    const schema = z.object({
      tabs: z.array(z.discriminatedUnion('kind', [objectOption, namedOption])),
    });

    expect(formatIssues(schema, { tabs: [{ kind: 'other' }] })).toBe(
      '✖ Invalid input: expected one of "object", "named"\n  → at tabs[0].kind'
    );
  });

  it('preserves shared errors and ambiguous locations alongside merged allowed values', () => {
    const schema = z.object({
      value: z.union([
        objectOption.extend({ id: z.string() }),
        namedOption.extend({ id: z.string() }),
      ]),
    });

    expect(formatIssues(schema, { value: {} })).toBe(
      '✖ Input does not match any supported format. Depending on the intended format, check: size, name\n  → at value\n' +
        '✖ Invalid input: expected one of "object", "named"\n  → at value.kind\n' +
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

  it('summarizes nested unions at their common location', () => {
    const schema = z.object({
      tabs: z
        .array(
          z.union([
            z.union([
              z.object({ value: z.object({ size: z.number() }) }),
              z.object({ id: z.string().max(100) }),
            ]),
            z.object({ title: z.string().max(100) }),
          ])
        )
        .max(10),
    });

    expect(formatIssues(schema, { tabs: [{ value: { size: 'invalid' } }] })).toBe(
      '✖ Input does not match any supported format. Depending on the intended format, check: value, id, title\n  → at tabs[0]'
    );
  });

  it('reports a value that matches more than one exclusive option', () => {
    const schema = z.xor([z.object({ size: z.number() }), z.object({ size: z.number().int() })]);

    expect(formatIssues(schema, { size: 1 })).toBe(
      '✖ Invalid input: matches more than one allowed option (1, 2)'
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
});
