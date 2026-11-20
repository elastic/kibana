/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isIssueOnTemplateValue, isTemplateValue } from './template_value';

const issuesOf = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues;
};

describe('isTemplateValue', () => {
  it.each(['{{ inputs.a }}', '${{ inputs.a }}', 'x {% if a %}b{% endif %}'])(
    'is true for %s',
    (value) => {
      expect(isTemplateValue(value)).toBe(true);
    }
  );

  it.each(['plain', '', 1, null, undefined, { a: '{{ b }}' }])('is false for %p', (value) => {
    expect(isTemplateValue(value)).toBe(false);
  });
});

describe('isIssueOnTemplateValue', () => {
  const reason = z.enum(['a', 'b']);

  it('is true for an issue on a template value', () => {
    const value = { reason: '{{ inputs.reason }}' };
    const issues = issuesOf(z.object({ reason }), value);

    expect(issues).toHaveLength(1);
    expect(isIssueOnTemplateValue(issues[0], value)).toBe(true);
  });

  it('is false for an issue on a concrete value', () => {
    const value = { reason: 'c' };
    const issues = issuesOf(z.object({ reason }), value);

    expect(isIssueOnTemplateValue(issues[0], value)).toBe(false);
  });

  it('is false for a missing value and for an issue at the root', () => {
    const missing = issuesOf(z.object({ reason }), {});
    const root = issuesOf(z.object({ reason }), 'x');

    expect(isIssueOnTemplateValue(missing[0], {})).toBe(false);
    expect(isIssueOnTemplateValue(root[0], 'x')).toBe(false);
  });

  it('treats a template that supplies the whole value as a template, given a base path', () => {
    const issues = issuesOf(z.object({ reason }), '${{ inputs.request }}');

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual([]);
    expect(isIssueOnTemplateValue(issues[0], { with: '${{ inputs.request }}' }, ['with'])).toBe(
      true
    );
    expect(isIssueOnTemplateValue(issues[0], { with: 'plain' }, ['with'])).toBe(false);
  });

  describe('invalid_union', () => {
    const byIds = z.object({ reason, ids: z.array(z.string()) });
    const byQuery = z.object({ reason, query: z.record(z.string(), z.unknown()) });
    const schema = z.object({ with: z.union([byIds, byQuery]) });

    it('is true when one branch fails on a template alone', () => {
      const value = { with: { reason: '{{ inputs.reason }}', query: {} } };
      const issues = issuesOf(schema, value);

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe('invalid_union');
      expect(isIssueOnTemplateValue(issues[0], value)).toBe(true);
    });

    it('is true through a nested union', () => {
      const nested = z.object({
        with: z.union([z.object({ status: z.literal('open') }), z.union([byIds, byQuery])]),
      });
      const value = { with: { reason: '${{ inputs.reason }}', ids: [] } };
      const issues = issuesOf(nested, value);

      expect(isIssueOnTemplateValue(issues[0], value)).toBe(true);
    });

    it('is false when every branch also fails on something concrete', () => {
      const value = { with: { reason: '{{ inputs.reason }}' } };
      const issues = issuesOf(schema, value);

      expect(isIssueOnTemplateValue(issues[0], value)).toBe(false);
    });

    it('is true for a discriminated union whose templated discriminator picks no branch', () => {
      // zod reports `invalid_union` on the discriminator with no branch errors at all.
      const discriminated = z.object({
        with: z.discriminatedUnion('type', [
          z.object({ type: z.literal('a'), x: z.string() }),
          z.object({ type: z.literal('b'), y: z.string() }),
        ]),
      });
      const value = { with: { type: '{{ inputs.type }}', x: 'x' } };
      const issues = issuesOf(discriminated, value);

      expect(issues[0].code).toBe('invalid_union');
      expect(isIssueOnTemplateValue(issues[0], value)).toBe(true);
    });

    it('is false for a discriminated union with a concrete discriminator that matches no branch', () => {
      const discriminated = z.object({
        with: z.discriminatedUnion('type', [z.object({ type: z.literal('a') })]),
      });
      const value = { with: { type: 'c' } };
      const issues = issuesOf(discriminated, value);

      expect(isIssueOnTemplateValue(issues[0], value)).toBe(false);
    });

    it('is false when no branch is satisfied by the templates', () => {
      const value = { with: { reason: 'c', query: {} } };
      const issues = issuesOf(schema, value);

      expect(isIssueOnTemplateValue(issues[0], value)).toBe(false);
    });
  });
});
