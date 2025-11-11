/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  convertInlineSchemaToZod,
  expectZodSchemaEqual,
  getSchemaAtPath,
  getZodTypeName,
  inferZodType,
  isValidSchemaPath,
} from './zod_utils';

describe('isValidSchemaPath', () => {
  it('should return true for simple paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.string() }), 'a')).toBe(true);
  });

  it('should return false for invalid paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.string() }), 'b')).toBe(false);
  });

  it('should return true for nested paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.object({ b: z.string() }) }), 'a.b')).toBe(true);
  });

  it('should return true for array paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[0]')).toBe(true);
  });

  it('should return false for array paths with invalid index', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).length(5) }), 'a[10]')).toBe(false);
  });

  it('should return true for unconstrained arrays with any valid index', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[0]')).toBe(true);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[100]')).toBe(true);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[999]')).toBe(true);
  });

  it('should return false for negative array indices', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[-1]')).toBe(false);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).length(5) }), 'a[-1]')).toBe(false);
  });

  it('should respect max length constraints', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).max(3) }), 'a[2]')).toBe(true);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).max(3) }), 'a[3]')).toBe(false);
  });

  it('should return true for nested array/object paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.object({ b: z.string() })) }), 'a[0].b')).toBe(
      true
    );
  });

  it('should return true for union paths', () => {
    expect(
      isValidSchemaPath(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]), 'a')
    ).toBe(true);
    expect(
      isValidSchemaPath(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]), 'b')
    ).toBe(true);
    expect(
      isValidSchemaPath(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]), 'c')
    ).toBe(false);
    expect(isValidSchemaPath(z.union([z.object({ a: z.string() }), z.any()]), 'c')).toBe(true);
  });

  it('should return true for union paths array', () => {
    expect(
      isValidSchemaPath(
        z.object({ alerts: z.array(z.union([z.object({ a: z.string() }), z.any()])) }),
        'alerts[0].a'
      )
    ).toBe(true);
    expect(
      isValidSchemaPath(
        z.object({ alerts: z.array(z.union([z.object({ a: z.string() }), z.any()])) }),
        'alerts[0].b'
      )
    ).toBe(true);
  });
});

describe('getSchemaAtPath', () => {
  it('should return the correct type for simple paths', () => {
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.string() }), 'a').schema as z.ZodType,
      z.string()
    );
  });

  it('should return the correct type for nested paths', () => {
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.object({ b: z.array(z.string()) }) }), 'a.b[0]')
        .schema as z.ZodType,
      z.string()
    );
  });

  it('should return null for array paths with invalid index', () => {
    expect(
      getSchemaAtPath(z.object({ a: z.array(z.string()).length(5) }), 'a[10]').schema
    ).toBeNull();
  });

  it('should return element schema for unconstrained arrays', () => {
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.array(z.string()) }), 'a[0]').schema as z.ZodType,
      z.string()
    );
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.array(z.string()) }), 'a[999]').schema as z.ZodType,
      z.string()
    );
  });

  it('should return null for negative indices', () => {
    expect(getSchemaAtPath(z.object({ a: z.array(z.string()) }), 'a[-1]').schema).toBeNull();
  });

  it('should return null for invalid paths', () => {
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'b').schema).toBeNull();
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'a.b').schema).toBeNull();
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'a[1]').schema).toBeNull();
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'a[0].b').schema).toBeNull();
  });

  it('should return any for optional any in nested object', () => {
    const schema = z.object({ a: z.object({ b: z.any().optional() }) });
    const result = getSchemaAtPath(schema, 'a.b');
    expectZodSchemaEqual(result.schema as z.ZodType, z.any());
    expect(result.scopedToPath).toBe('a.b');
  });
});

describe('getZodTypeName', () => {
  it('should return the correct type for basic schemas', () => {
    expect(getZodTypeName(z.string())).toBe('string');
    expect(getZodTypeName(z.number())).toBe('number');
    expect(getZodTypeName(z.boolean())).toBe('boolean');
    expect(getZodTypeName(z.array(z.string()))).toBe('array');
    expect(getZodTypeName(z.object({}))).toBe('object');
    expect(getZodTypeName(z.date())).toBe('date');
    expect(getZodTypeName(z.any())).toBe('any');
    expect(getZodTypeName(z.null())).toBe('null');
    expect(getZodTypeName(z.unknown())).toBe('unknown');
    expect(getZodTypeName(z.literal('test'))).toBe('literal');
  });

  it('should unwrap ZodDefault wrappers', () => {
    expect(getZodTypeName(z.string().default('hello'))).toBe('string');
    expect(getZodTypeName(z.number().default(42))).toBe('number');
    expect(getZodTypeName(z.boolean().default(true))).toBe('boolean');
    expect(getZodTypeName(z.array(z.string()).default(['a', 'b']))).toBe('array');
    expect(getZodTypeName(z.object({}).default({}))).toBe('object');
  });

  it('should unwrap ZodOptional wrappers', () => {
    expect(getZodTypeName(z.string().optional())).toBe('string');
    expect(getZodTypeName(z.number().optional())).toBe('number');
    expect(getZodTypeName(z.boolean().optional())).toBe('boolean');
    expect(getZodTypeName(z.array(z.string()).optional())).toBe('array');
    expect(getZodTypeName(z.object({}).optional())).toBe('object');
  });

  it('should unwrap both ZodDefault and ZodOptional wrappers', () => {
    expect(getZodTypeName(z.string().default('hello').optional())).toBe('string');
    expect(getZodTypeName(z.number().default(42).optional())).toBe('number');
    expect(getZodTypeName(z.array(z.string()).default(['a']).optional())).toBe('array');
  });

  it('should handle nested wrappers correctly', () => {
    // Test with multiple layers of wrapping
    const schema = z.string().default('test').optional();
    expect(getZodTypeName(schema)).toBe('string');
  });

  it('should return unknown for truly unknown types', () => {
    // Create a custom schema that doesn't match any known types
    const customSchema = z.tuple([z.string(), z.number()]);
    expect(getZodTypeName(customSchema)).toBe('unknown');
  });
});

describe('inferZodType', () => {
  it('should return the correct type', () => {
    expectZodSchemaEqual(
      inferZodType({ a: 'b', c: 1, d: true, e: [1, 2, 3], f: { g: 'h' } }),
      z.object({
        a: z.string(),
        c: z.number(),
        d: z.boolean(),
        e: z.array(z.number()).length(3),
        f: z.object({ g: z.string() }),
      })
    );
  });
});

describe('convertInlineSchemaToZod', () => {
  it('should convert simple schema types to Zod schemas', () => {
    const schema = {
      name: 'string',
      age: 'number',
      active: 'boolean',
    };
    const result = convertInlineSchemaToZod(schema);
    expect(result.parse({ name: 'John', age: 30, active: true })).toEqual({
      name: 'John',
      age: 30,
      active: true,
    });
    expect(() => result.parse({ name: 123 })).toThrow();
  });

  it('should convert nested object schemas recursively', () => {
    const schema = {
      user: {
        profile: {
          firstName: 'string',
          lastName: 'string',
        },
        preferences: {
          theme: 'string',
          notifications: 'boolean',
        },
      },
    };
    const result = convertInlineSchemaToZod(schema);
    const valid = {
      user: {
        profile: { firstName: 'John', lastName: 'Doe' },
        preferences: { theme: 'dark', notifications: true },
      },
    };
    expect(result.parse(valid)).toEqual(valid);
  });

  it('should handle array type definitions', () => {
    const schema = {
      tags: ['string'],
      scores: ['number'],
    };
    const result = convertInlineSchemaToZod(schema);
    expect(result.parse({ tags: ['tag1', 'tag2'], scores: [1, 2, 3] })).toEqual({
      tags: ['tag1', 'tag2'],
      scores: [1, 2, 3],
    });
  });

  it('should use passthrough to allow additional properties', () => {
    const schema = { name: 'string' };
    const result = convertInlineSchemaToZod(schema);
    // Passthrough allows extra properties
    expect(result.parse({ name: 'John', extra: 'property' })).toEqual({
      name: 'John',
      extra: 'property',
    });
  });

  it('should handle deeply nested structures', () => {
    const schema = {
      fields: {
        metadata: {
          routing: {
            shard: 'number',
            primary: 'boolean',
          },
        },
      },
    };
    const result = convertInlineSchemaToZod(schema);
    const valid = {
      fields: {
        metadata: {
          routing: { shard: 0, primary: true },
        },
      },
    };
    expect(result.parse(valid)).toEqual(valid);
  });

  it('should return empty object for empty schema', () => {
    const result = convertInlineSchemaToZod({});
    expect(result.parse({})).toEqual({});
    expect(result.parse({ extra: 'property' })).toEqual({ extra: 'property' });
  });
});
