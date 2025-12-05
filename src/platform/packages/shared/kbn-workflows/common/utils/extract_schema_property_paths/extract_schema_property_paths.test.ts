/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
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
        { path: 'name', type: 'string' },
        { path: 'age', type: 'number' },
        { path: 'active', type: 'boolean' },
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
        { path: 'user', type: 'object' },
        { path: 'user.profile', type: 'object' },
        { path: 'user.profile.firstName', type: 'string' },
        { path: 'user.profile.lastName', type: 'string' },
        { path: 'user.settings', type: 'object' },
        { path: 'user.settings.theme', type: 'string' },
        { path: 'user.settings.notifications', type: 'boolean' },
        { path: 'metadata', type: 'object' },
        { path: 'metadata.createdAt', type: 'date' },
        { path: 'metadata.version', type: 'number' },
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
        { path: 'required', type: 'string' },
        { path: 'optional', type: 'optional' },
      ]);
    });

    it('should handle nullable fields', () => {
      const schema = z.object({
        required: z.string(),
        nullable: z.string().nullable(),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'required', type: 'string' },
        { path: 'nullable', type: 'nullable' },
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
        { path: 'user', type: 'optional' },
        { path: 'user.name', type: 'string' },
        { path: 'user.email', type: 'string' },
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
        { path: 'steps', type: 'record' },
        { path: 'steps.output', type: 'optional' },
        { path: 'steps.error', type: 'optional' },
      ]);
    });

    it('should handle simple record types', () => {
      const schema = z.object({
        config: z.record(z.string(), z.string()),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([{ path: 'config', type: 'record' }]);
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
        { path: 'tags', type: 'array' },
        { path: 'items', type: 'array' },
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

      expect(result).toContainEqual({ path: 'event', type: 'optional' });
      expect(result).toContainEqual({ path: 'inputs', type: 'optional' });
      expect(result).toContainEqual({ path: 'execution', type: 'object' });
      expect(result).toContainEqual({
        path: 'execution.id',
        type: 'string',
      });
      expect(result).toContainEqual({
        path: 'execution.status',
        type: 'string',
      });
      expect(result).toContainEqual({ path: 'workflow', type: 'object' });
      expect(result).toContainEqual({
        path: 'workflow.id',
        type: 'string',
      });
      expect(result).toContainEqual({
        path: 'workflow.name',
        type: 'string',
      });
      expect(result).toContainEqual({ path: 'steps', type: 'record' });
      expect(result).toContainEqual({
        path: 'steps.output',
        type: 'optional',
      });
      expect(result).toContainEqual({
        path: 'steps.error',
        type: 'optional',
      });
      expect(result).toContainEqual({ path: 'foreach', type: 'optional' });
      expect(result).toContainEqual({
        path: 'foreach.items',
        type: 'array',
      });
      expect(result).toContainEqual({
        path: 'foreach.index',
        type: 'number',
      });
      expect(result).toContainEqual({ path: 'foreach.item', type: 'any' });
      expect(result).toContainEqual({
        path: 'foreach.total',
        type: 'number',
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
        { path: 'str', type: 'string' },
        { path: 'num', type: 'number' },
        { path: 'bool', type: 'boolean' },
        { path: 'date', type: 'date' },
        { path: 'bigint', type: 'bigint' },
        { path: 'any', type: 'any' },
        { path: 'unknown', type: 'unknown' },
        { path: 'nullType', type: 'null' },
        { path: 'undefinedType', type: 'undefined' },
        { path: 'voidType', type: 'void' },
        { path: 'never', type: 'never' },
      ]);
    });

    it('should handle literal and enum types', () => {
      const schema = z.object({
        literal: z.literal('test'),
        enum: z.enum(['option1', 'option2', 'option3']),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([
        { path: 'literal', type: 'literal' },
        { path: 'enum', type: 'enum' },
      ]);
    });

    it('should handle union types', () => {
      const schema = z.object({
        union: z.union([z.string(), z.number()]),
      });

      const result = extractSchemaPropertyPaths(schema);

      expect(result).toEqual([{ path: 'union', type: 'union' }]);
    });
  });
});
