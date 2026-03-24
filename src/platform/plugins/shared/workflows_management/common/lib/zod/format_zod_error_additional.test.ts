/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { formatZodError } from './format_zod_error';

describe('formatZodError - additional coverage', () => {
  describe('non-ZodError inputs', () => {
    it('should return message from error.message when issues is not an array', () => {
      const fakeError = { message: 'Some custom error' };
      const result = formatZodError(fakeError as never);
      expect(result.message).toBe('Some custom error');
    });

    it('should stringify error when no message property exists', () => {
      const fakeError = {};
      const result = formatZodError(fakeError as never);
      expect(result.message).toBe('[object Object]');
    });

    it('should handle null issues array', () => {
      const fakeError = { issues: null, message: 'null issues' };
      const result = formatZodError(fakeError as never);
      expect(result.message).toBe('null issues');
    });
  });

  describe('invalid_literal errors for type field', () => {
    it('should handle elasticsearch.* type prefix', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'elasticsearch.nonexistent',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('Unknown Elasticsearch API');
      expect(result.message).toContain('elasticsearch.nonexistent');
    });

    it('should handle kibana.* type prefix', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'kibana.nonexistent',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('Unknown Kibana API');
      expect(result.message).toContain('kibana.nonexistent');
    });

    it('should handle generic connector type', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'custom_type',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('Unknown connector type');
      expect(result.message).toContain('custom_type');
    });

    it('should handle invalid_literal for type in the no-schema branch', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_literal' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid literal',
            received: 'elasticsearch.badapi',
          },
        ],
      };

      // No schema provided
      const result = formatZodError(mockError as never);
      expect(result.message).toContain('Unknown Elasticsearch API');
    });
  });

  describe('invalid_type for top-level triggers and steps', () => {
    it('should format missing triggers error', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['triggers'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toBe('No triggers found. Add at least one trigger.');
    });

    it('should format missing steps error', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toBe('No steps found. Add at least one step.');
    });

    it('should format missing triggers when schema is provided', () => {
      const schema = z.object({ triggers: z.array(z.unknown()) });
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['triggers'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toBe('No triggers found. Add at least one trigger.');
    });

    it('should format missing steps when schema is provided', () => {
      const schema = z.object({ steps: z.array(z.unknown()) });
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['steps'],
            message: 'Expected array, received undefined',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toBe('No steps found. Add at least one step.');
    });
  });

  describe('invalid_union errors without schema', () => {
    it('should format invalid_union for triggers path', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['triggers', 0],
            message: 'Invalid input',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toBe('Invalid trigger type. Available: manual, alert, scheduled');
    });

    it('should format invalid_union for type path', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['steps', 0, 'type'],
            message: 'Invalid input',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toBe(
        'Invalid connector type. Use Ctrl+Space to see available options.'
      );
    });
  });

  describe('dynamic union error messages from unionErrors', () => {
    it('should generate union message from discriminator info in unionErrors', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['someField'],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [
                  {
                    code: 'invalid_literal' as const,
                    path: ['someField', 'type'],
                    expected: 'option_a',
                  },
                ],
              },
              {
                issues: [
                  {
                    code: 'invalid_literal' as const,
                    path: ['someField', 'type'],
                    expected: 'option_b',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('someField should be oneOf:');
      expect(result.message).toContain('option_a');
      expect(result.message).toContain('option_b');
    });

    it('should generate union message from required fields when no discriminator', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['someField'],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [
                  {
                    code: 'invalid_type' as const,
                    path: ['someField', 'name'],
                    message: 'Required',
                  },
                  {
                    code: 'invalid_type' as const,
                    path: ['someField', 'id'],
                    message: 'Required',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('someField should be oneOf:');
      expect(result.message).toContain('id');
      expect(result.message).toContain('name');
    });

    it('should fall back to generic message when unionErrors has no analyzable issues', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: ['someField'],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [],
              },
            ],
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('someField has an invalid value');
    });
  });

  describe('schema-aware union error formatting', () => {
    it('should format union errors with schema for a union field', () => {
      const schema = z.object({
        mode: z.union([z.literal('fast'), z.literal('slow'), z.literal('auto')]),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });

    it('should handle optional union field in schema', () => {
      const schema = z.object({
        mode: z.optional(z.union([z.literal('fast'), z.literal('slow')])),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });

    it('should handle nullable union field in schema', () => {
      const schema = z.object({
        mode: z.nullable(z.union([z.literal('a'), z.literal('b')])),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });

    it('should handle default-wrapped union in schema', () => {
      const schema = z.object({
        mode: z.union([z.literal('fast'), z.literal('slow')]).default('fast'),
      });

      const parseResult = schema.safeParse({ mode: 'invalid' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toContain('mode should be oneOf:');
      }
    });
  });

  describe('analyzeUnionSchema with different schema types', () => {
    it('should describe string option in union', () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['value'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toContain('value should be oneOf:');
      expect(result.message).toContain('string value');
      expect(result.message).toContain('number value');
    });

    it('should describe boolean option in union', () => {
      const schema = z.object({
        flag: z.union([z.boolean(), z.string()]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['flag'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toContain('boolean value');
    });

    it('should describe object with discriminator in union', () => {
      const schema = z.object({
        item: z.union([
          z.object({ type: z.literal('a'), name: z.string() }),
          z.object({ type: z.literal('b'), value: z.number() }),
        ]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['item'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toContain('type: "a"');
      expect(result.message).toContain('type: "b"');
    });

    it('should describe object without discriminator listing required props', () => {
      const schema = z.object({
        item: z.union([
          z.object({ name: z.string(), age: z.number() }),
          z.object({ title: z.string() }),
        ]),
      });

      const mockError = {
        issues: [
          {
            code: 'unknown' as const,
            path: ['item'],
            message: 'Expected union',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toContain('item should be oneOf:');
      // Should list required props
      expect(result.message).toContain('props:');
    });
  });

  describe('multiple issues formatting', () => {
    it('should join multiple formatted issues with commas', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_type' as const,
            path: ['triggers'],
            message: 'Expected array',
          },
          {
            code: 'invalid_type' as const,
            path: ['steps'],
            message: 'Expected array',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('No triggers found');
      expect(result.message).toContain('No steps found');
      expect(result.formattedError.issues).toHaveLength(2);
    });
  });

  describe('fallback for unknown error codes', () => {
    it('should append path to message for unknown error codes', () => {
      const mockError = {
        issues: [
          {
            code: 'custom' as const,
            path: ['steps', 0, 'with', 'param'],
            message: 'Custom validation failed',
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toBe('Custom validation failed at steps.0.with.param');
    });

    it('should append path for unknown codes in the schema branch too', () => {
      const schema = z.object({ field: z.string() });
      const mockError = {
        issues: [
          {
            code: 'custom' as const,
            path: ['field'],
            message: 'Some custom issue',
          },
        ],
      };

      const result = formatZodError(mockError as never, schema);
      expect(result.message).toBe('Some custom issue at field');
    });
  });

  describe('empty path handling', () => {
    it('should use "field" as fallback when path is empty in union error', () => {
      const mockError = {
        issues: [
          {
            code: 'invalid_union' as const,
            path: [],
            message: 'Invalid input',
            unionErrors: [
              {
                issues: [
                  {
                    code: 'invalid_literal' as const,
                    path: ['type'],
                    expected: 'a',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = formatZodError(mockError as never);
      expect(result.message).toContain('field should be oneOf:');
    });
  });

  describe('real ZodError integration', () => {
    it('should format a real ZodError from safeParse with schema', () => {
      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const parseResult = schema.safeParse({ name: 123, count: 'not-a-number' });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const result = formatZodError(parseResult.error, schema);
        expect(result.message).toBeDefined();
        expect(result.formattedError.issues.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
