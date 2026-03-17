/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import {
  convertJsonSchemaToZod,
  convertJsonSchemaToZodWithRefs,
} from '@kbn/workflows/spec/lib/build_fields_zod_validator';

/**
 * Documents JSON Schema keywords that the convertJsonSchemaToZod wrapper does NOT
 * yet enforce. Each test provides invalid data that SHOULD fail validation if the
 * keyword were implemented, but currently passes.
 *
 * When a keyword is implemented:
 *   - its test here will start FAILING (the assertion `toBe(true)` no longer holds)
 *   - move it to build_fields_zod_validator.test.ts with the expectation flipped to `toBe(false)`
 *
 * Run:
 *   yarn test:jest src/platform/plugins/shared/workflows_management/common/lib/json_schema_to_zod.ignored_keywords.test.ts
 */
describe('convertJsonSchemaToZod – unimplemented keyword gaps', () => {
  // ─── additionalProperties: {schema} ─────────────────────────────────────────
  // additionalProperties: false IS enforced (see build_fields_zod_validator.test.ts).
  // The schema-value form requires superRefine to validate extra keys — tracked here.
  // Same recursive-traversal limitation applies for deeply nested cases.
  describe('additionalProperties: schema', () => {
    it('does not validate extra properties against the additionalProperties schema', () => {
      const schema = convertJsonSchemaToZod({
        type: 'object',
        properties: { name: { type: 'string' } },
        additionalProperties: { type: 'number' },
      } as JSONSchema7);
      const result = schema.safeParse({ name: 'Alice', extra: 'not a number' });
      expect(result.success).toBe(true); // Should be false when implemented
    });
  });

  // ─── uniqueItems ─────────────────────────────────────────────────────────────
  // Same limitation as additionalProperties — shallow enrichment only; requires
  // recursive traversal to handle uniqueItems nested inside object properties.
  describe('uniqueItems', () => {
    it('does not reject duplicate array items', () => {
      const schema = convertJsonSchemaToZod({
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      } as JSONSchema7);
      const result = schema.safeParse(['a', 'b', 'a']);
      expect(result.success).toBe(true); // Should be false when implemented
    });
  });

  // ─── allOf ──────────────────────────────────────────────────────────────────
  describe('allOf', () => {
    it('does not validate against all sub-schemas', () => {
      const schema = convertJsonSchemaToZod({
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
          { type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
        ],
      } as JSONSchema7);
      // allOf is not dispatched → schema falls through to z.unknown()
      const result = schema.safeParse({ a: 'hello' }); // missing required 'b'
      expect(result.success).toBe(true); // Should be false when implemented
    });
  });

  // ─── $ref / definitions ─────────────────────────────────────────────────────
  // Note: convertJsonSchemaToZodWithRefs + buildFieldsZodValidator DO resolve
  // $ref at the property level. This test confirms convertJsonSchemaToZod alone
  // (used for nested schemas without a root) still does not.
  describe('$ref / definitions', () => {
    it('does not resolve inline $ref when called without a root schema', () => {
      const schema = convertJsonSchemaToZod({
        type: 'object',
        properties: {
          user: { $ref: '#/definitions/User' },
        },
        definitions: {
          User: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
      } as JSONSchema7);
      // user property becomes z.unknown() — any value passes
      const result = schema.safeParse({ user: 12345 });
      expect(result.success).toBe(true); // Should be false when implemented
    });

    it('resolves $ref when using convertJsonSchemaToZodWithRefs', () => {
      const rootSchema: JSONSchema7 = {
        type: 'object',
        properties: {
          user: { $ref: '#/definitions/User' },
        },
        definitions: {
          User: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
      };
      // This path already works via resolveRef
      const userSchema = convertJsonSchemaToZodWithRefs(
        { $ref: '#/definitions/User' } as JSONSchema7,
        rootSchema as Parameters<typeof convertJsonSchemaToZodWithRefs>[1]
      );
      const validResult = userSchema.safeParse({ name: 'Alice' });
      expect(validResult.success).toBe(true);
      // Also verify that invalid data fails, proving the $ref is enforced
      const invalidResult = userSchema.safeParse({});
      expect(invalidResult.success).toBe(false);
    });
  });

  // ─── prefixItems (tuple validation) ─────────────────────────────────────────
  describe('prefixItems', () => {
    it('does not validate positional items in a tuple', () => {
      const schema = convertJsonSchemaToZod({
        type: 'array',
        prefixItems: [{ type: 'string' }, { type: 'number' }],
      } as JSONSchema7);
      // [42, "wrong"] has wrong types at each position
      const result = schema.safeParse([42, 'wrong']);
      expect(result.success).toBe(true); // Should be false when implemented
    });
  });

  // ─── items as tuple (array form) ────────────────────────────────────────────
  describe('items as tuple', () => {
    it('does not validate tuple-form items', () => {
      const schema = convertJsonSchemaToZod({
        type: 'array',
        items: [{ type: 'string' }, { type: 'number' }],
      } as JSONSchema7);
      const result = schema.safeParse([42, 'wrong']);
      expect(result.success).toBe(true); // Should be false when implemented
    });
  });

  // ─── format (unsupported values) ────────────────────────────────────────────
  // These formats were removed from JSON_SCHEMA_FORMAT_VALUES suggestions (Track 1).
  // The tests below confirm the validator also does not enforce them if a user
  // writes them by hand. Implement via .refine() when needed; use `pattern` for now.
  describe('format – unsupported values', () => {
    it('does not validate ipv4 format', () => {
      const schema = convertJsonSchemaToZod({ type: 'string', format: 'ipv4' } as JSONSchema7);
      expect(schema.safeParse('not-an-ip').success).toBe(true);
    });

    it('does not validate ipv6 format', () => {
      const schema = convertJsonSchemaToZod({ type: 'string', format: 'ipv6' } as JSONSchema7);
      expect(schema.safeParse('not-an-ipv6').success).toBe(true);
    });

    it('does not validate hostname format', () => {
      const schema = convertJsonSchemaToZod({
        type: 'string',
        format: 'hostname',
      } as JSONSchema7);
      expect(schema.safeParse('not a valid hostname!!!').success).toBe(true);
    });

    it('does not validate regex format - can be achieved through pattern instead of format', () => {
      const schema = convertJsonSchemaToZod({ type: 'string', format: 'regex' } as JSONSchema7);
      expect(schema.safeParse('[invalid regex').success).toBe(true);
    });
  });
});
