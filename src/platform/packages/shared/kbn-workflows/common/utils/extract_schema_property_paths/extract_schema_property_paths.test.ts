/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodFirstPartyTypeKind } from '@kbn/zod';
import { extractSchemaPropertyPaths } from './extract_schema_property_paths';

describe('extractSchemaPropertyPaths', () => {
  describe('basic types', () => {
    it('should extract paths from a simple object schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'name', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'age', type: ZodFirstPartyTypeKind.ZodNumber },
        { path: 'active', type: ZodFirstPartyTypeKind.ZodBoolean },
      ]);
    });

    it('should extract paths from nested object schema', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string(),
            lastName: z.string(),
          }),
          settings: z.object({
            theme: z.string(),
            notifications: z.boolean(),
          }),
        }),
        metadata: z.object({
          createdAt: z.date(),
          version: z.number(),
        }),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'user', type: ZodFirstPartyTypeKind.ZodObject },
        { path: 'user.profile', type: ZodFirstPartyTypeKind.ZodObject },
        { path: 'user.profile.firstName', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'user.profile.lastName', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'user.settings', type: ZodFirstPartyTypeKind.ZodObject },
        { path: 'user.settings.theme', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'user.settings.notifications', type: ZodFirstPartyTypeKind.ZodBoolean },
        { path: 'metadata', type: ZodFirstPartyTypeKind.ZodObject },
        { path: 'metadata.createdAt', type: ZodFirstPartyTypeKind.ZodDate },
        { path: 'metadata.version', type: ZodFirstPartyTypeKind.ZodNumber },
      ]);
    });
  });

  describe('optional and nullable types', () => {
    it('should handle optional fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'required', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'optional', type: ZodFirstPartyTypeKind.ZodOptional },
      ]);
    });

    it('should handle nullable fields', () => {
      const schema = z.object({
        required: z.string(),
        nullable: z.string().nullable(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'required', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'nullable', type: ZodFirstPartyTypeKind.ZodNullable },
      ]);
    });

    it('should unwrap optional nested objects', () => {
      const schema = z.object({
        user: z
          .object({
            name: z.string(),
            email: z.string(),
          })
          .optional(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'user', type: ZodFirstPartyTypeKind.ZodOptional },
        { path: 'user.name', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'user.email', type: ZodFirstPartyTypeKind.ZodString },
      ]);
    });
  });

  describe('record types', () => {
    it('should handle record types', () => {
      const schema = z.object({
        steps: z.record(
          z.string(),
          z.object({
            output: z.any().optional(),
            error: z.any().optional(),
          })
        ),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'steps', type: ZodFirstPartyTypeKind.ZodRecord },
        { path: 'steps.output', type: ZodFirstPartyTypeKind.ZodOptional },
        { path: 'steps.error', type: ZodFirstPartyTypeKind.ZodOptional },
      ]);
    });

    it('should handle simple record types', () => {
      const schema = z.object({
        config: z.record(z.string(), z.string()),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([{ path: 'config', type: ZodFirstPartyTypeKind.ZodRecord }]);
    });
  });

  describe('array types', () => {
    it('should handle array types without extracting paths', () => {
      const schema = z.object({
        tags: z.array(z.string()),
        items: z.array(
          z.object({
            id: z.string(),
            value: z.number(),
          })
        ),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'tags', type: ZodFirstPartyTypeKind.ZodArray },
        { path: 'items', type: ZodFirstPartyTypeKind.ZodArray },
      ]);
    });
  });

  describe('complex schemas', () => {
    it('should handle StepContext-like schema', () => {
      const schema = z.object({
        event: z.any().optional(),
        inputs: z.any().optional(),
        execution: z.object({
          id: z.string(),
          status: z.string(),
        }),
        workflow: z.object({
          id: z.string(),
          name: z.string(),
        }),
        steps: z.record(
          z.string(),
          z.object({
            output: z.any().optional(),
            error: z.any().optional(),
          })
        ),
        foreach: z
          .object({
            items: z.array(z.any()),
            index: z.number(),
            item: z.any(),
            total: z.number(),
          })
          .optional(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toContainEqual({ path: 'event', type: ZodFirstPartyTypeKind.ZodOptional });
      expect(result).toContainEqual({ path: 'inputs', type: ZodFirstPartyTypeKind.ZodOptional });
      expect(result).toContainEqual({ path: 'execution', type: ZodFirstPartyTypeKind.ZodObject });
      expect(result).toContainEqual({
        path: 'execution.id',
        type: ZodFirstPartyTypeKind.ZodString,
      });
      expect(result).toContainEqual({
        path: 'execution.status',
        type: ZodFirstPartyTypeKind.ZodString,
      });
      expect(result).toContainEqual({ path: 'workflow', type: ZodFirstPartyTypeKind.ZodObject });
      expect(result).toContainEqual({
        path: 'workflow.id',
        type: ZodFirstPartyTypeKind.ZodString,
      });
      expect(result).toContainEqual({
        path: 'workflow.name',
        type: ZodFirstPartyTypeKind.ZodString,
      });
      expect(result).toContainEqual({ path: 'steps', type: ZodFirstPartyTypeKind.ZodRecord });
      expect(result).toContainEqual({
        path: 'steps.output',
        type: ZodFirstPartyTypeKind.ZodOptional,
      });
      expect(result).toContainEqual({
        path: 'steps.error',
        type: ZodFirstPartyTypeKind.ZodOptional,
      });
      expect(result).toContainEqual({ path: 'foreach', type: ZodFirstPartyTypeKind.ZodOptional });
      expect(result).toContainEqual({
        path: 'foreach.items',
        type: ZodFirstPartyTypeKind.ZodArray,
      });
      expect(result).toContainEqual({
        path: 'foreach.index',
        type: ZodFirstPartyTypeKind.ZodNumber,
      });
      expect(result).toContainEqual({ path: 'foreach.item', type: ZodFirstPartyTypeKind.ZodAny });
      expect(result).toContainEqual({
        path: 'foreach.total',
        type: ZodFirstPartyTypeKind.ZodNumber,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty object schema', () => {
      const schema = z.object({});

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      expect(extractSchemaPropertyPaths(null)).toEqual([]);
      expect(extractSchemaPropertyPaths(undefined)).toEqual([]);
    });

    it('should handle non-object input', () => {
      expect(extractSchemaPropertyPaths('string')).toEqual([]);
      expect(extractSchemaPropertyPaths(123)).toEqual([]);
      expect(extractSchemaPropertyPaths(true)).toEqual([]);
    });

    it('should handle schema without _def', () => {
      const invalidSchema = { someProperty: 'value' };

      const result = extractSchemaPropertyPaths(invalidSchema);

      expect(result).toEqual([]);
    });
  });

  describe('various zod types', () => {
    it('should handle different primitive types', () => {
      const schema = z.object({
        str: z.string(),
        num: z.number(),
        bool: z.boolean(),
        date: z.date(),
        bigint: z.bigint(),
        any: z.any(),
        unknown: z.unknown(),
        nullType: z.null(),
        undefinedType: z.undefined(),
        voidType: z.void(),
        never: z.never(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'str', type: ZodFirstPartyTypeKind.ZodString },
        { path: 'num', type: ZodFirstPartyTypeKind.ZodNumber },
        { path: 'bool', type: ZodFirstPartyTypeKind.ZodBoolean },
        { path: 'date', type: ZodFirstPartyTypeKind.ZodDate },
        { path: 'bigint', type: ZodFirstPartyTypeKind.ZodBigInt },
        { path: 'any', type: ZodFirstPartyTypeKind.ZodAny },
        { path: 'unknown', type: ZodFirstPartyTypeKind.ZodUnknown },
        { path: 'nullType', type: ZodFirstPartyTypeKind.ZodNull },
        { path: 'undefinedType', type: ZodFirstPartyTypeKind.ZodUndefined },
        { path: 'voidType', type: ZodFirstPartyTypeKind.ZodVoid },
        { path: 'never', type: ZodFirstPartyTypeKind.ZodNever },
      ]);
    });

    it('should handle literal and enum types', () => {
      const schema = z.object({
        literal: z.literal('test'),
        enum: z.enum(['option1', 'option2', 'option3']),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'literal', type: ZodFirstPartyTypeKind.ZodLiteral },
        { path: 'enum', type: ZodFirstPartyTypeKind.ZodEnum },
      ]);
    });

    it('should handle union types', () => {
      const schema = z.object({
        union: z.union([z.string(), z.number()]),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([{ path: 'union', type: ZodFirstPartyTypeKind.ZodUnion }]);
    });
  });
});
