/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { validateKqlAgainstSchema } from './validate_kql_against_schema';

const EVENT_FIELD_PREFIX = 'event.';

const eventSchema = z.object({
  severity: z.string(),
  message: z.string(),
  source: z.string().optional(),
});

describe('validateKqlAgainstSchema', () => {
  describe('valid KQL', () => {
    it('returns valid: true for empty or whitespace-only string', () => {
      expect(validateKqlAgainstSchema('', eventSchema)).toEqual({ valid: true });
      expect(validateKqlAgainstSchema('   ', eventSchema)).toEqual({ valid: true });
    });

    it('returns valid: false for invalid KQL syntax', () => {
      const result = validateKqlAgainstSchema('invalid ( unclosed', eventSchema, {
        fieldPrefix: EVENT_FIELD_PREFIX,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toBeDefined();
    });
  });

  describe('fields allowed by schema (with fieldPrefix: "event.")', () => {
    it('returns valid: true when KQL uses only schema properties', () => {
      expect(
        validateKqlAgainstSchema('event.severity: "high"', eventSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });

      expect(
        validateKqlAgainstSchema('event.message: "error" and event.severity: "high"', eventSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });

      expect(
        validateKqlAgainstSchema('event.severity >= "high" or event.message: *', eventSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });
    });

    it('returns valid: false when KQL references a field not in the schema', () => {
      const result = validateKqlAgainstSchema('event.unknown: "x"', eventSchema, {
        fieldPrefix: EVENT_FIELD_PREFIX,
      });
      expect(result).toEqual({
        valid: false,
        error: 'KQL references field "event.unknown" which is not part of event.* properties.',
      });

      const result2 = validateKqlAgainstSchema(
        'event.severity: "high" and event.foo.bar: "baz"',
        eventSchema,
        { fieldPrefix: EVENT_FIELD_PREFIX }
      );
      expect(result2.valid).toBe(false);
      if (!result2.valid) expect(result2.error).toContain('event.foo.bar');
    });

    it('allows optional schema properties', () => {
      expect(
        validateKqlAgainstSchema('event.source: "api"', eventSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });
    });

    it('treats separator as given: fieldPrefix without trailing dot produces wrong paths', () => {
      const result = validateKqlAgainstSchema('event.severity: "high"', eventSchema, {
        fieldPrefix: 'event',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain('event.severity');
    });
  });

  describe('without fieldPrefix', () => {
    const flatSchema = z.object({
      name: z.string(),
      count: z.number(),
    });

    it('returns valid: true when KQL uses only schema property paths', () => {
      expect(validateKqlAgainstSchema('name: "test"', flatSchema)).toEqual({ valid: true });
      expect(validateKqlAgainstSchema('count > 0', flatSchema)).toEqual({ valid: true });
    });

    it('returns valid: false when KQL references a field not in the schema', () => {
      const result = validateKqlAgainstSchema('other: "x"', flatSchema);
      expect(result).toEqual({
        valid: false,
        error: 'KQL references field "other" which is not part of the properties.',
      });
    });
  });

  describe('nested schema', () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string(),
        role: z.string(),
      }),
      level: z.number(),
    });

    it('allows nested paths when they are in the schema', () => {
      expect(
        validateKqlAgainstSchema('event.user.name: "alice"', nestedSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });
      expect(
        validateKqlAgainstSchema('event.user.role: "admin" and event.level > 0', nestedSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });
    });

    it('rejects nested paths not in the schema', () => {
      const result = validateKqlAgainstSchema('event.user.email: "a@b.com"', nestedSchema, {
        fieldPrefix: EVENT_FIELD_PREFIX,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain('event.user.email');
    });
  });

  describe('wildcard field', () => {
    it('allows event.* when fieldPrefix is "event." and schema has properties', () => {
      expect(
        validateKqlAgainstSchema('event.*: *', eventSchema, {
          fieldPrefix: EVENT_FIELD_PREFIX,
        })
      ).toEqual({ valid: true });
    });

    it('rejects prefix.* when prefix is not in allowed set', () => {
      const result = validateKqlAgainstSchema('other.*: *', eventSchema, {
        fieldPrefix: EVENT_FIELD_PREFIX,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain('other.*');
    });
  });
});
