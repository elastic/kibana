/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodTypeName } from './get_zod_type_name';

describe('getZodTypeName', () => {
  it('should return the correct type for basic schemas', () => {
    expect(getZodTypeName(z.string())).toBe('string');
    expect(getZodTypeName(z.number())).toBe('number');
    expect(getZodTypeName(z.boolean())).toBe('boolean');
    expect(getZodTypeName(z.array(z.string()))).toBe('string[]');
    expect(getZodTypeName(z.object({}))).toBe('object');
    expect(getZodTypeName(z.date())).toBe('date');
    expect(getZodTypeName(z.any())).toBe('any');
    expect(getZodTypeName(z.null())).toBe('null');
    expect(getZodTypeName(z.unknown())).toBe('unknown');
    expect(getZodTypeName(z.literal('test'))).toBe('"test"');
  });

  it('should unwrap ZodDefault wrappers', () => {
    expect(getZodTypeName(z.string().default('hello'))).toBe('string');
    expect(getZodTypeName(z.number().default(42))).toBe('number');
    expect(getZodTypeName(z.boolean().default(true))).toBe('boolean');
    expect(getZodTypeName(z.array(z.string()).default(['a', 'b']))).toBe('string[]');
    expect(getZodTypeName(z.object({}).default({}))).toBe('object');
  });

  it('should unwrap ZodOptional wrappers', () => {
    expect(getZodTypeName(z.string().optional())).toBe('string');
    expect(getZodTypeName(z.number().optional())).toBe('number');
    expect(getZodTypeName(z.boolean().optional())).toBe('boolean');
    expect(getZodTypeName(z.array(z.string()).optional())).toBe('string[]');
    expect(getZodTypeName(z.object({}).optional())).toBe('object');
  });

  it('should unwrap both ZodDefault and ZodOptional wrappers', () => {
    expect(getZodTypeName(z.string().default('hello').optional())).toBe('string');
    expect(getZodTypeName(z.number().default(42).optional())).toBe('number');
    expect(getZodTypeName(z.array(z.string()).default(['a']).optional())).toBe('string[]');
  });

  it('should handle nested wrappers correctly', () => {
    // Test with multiple layers of wrapping
    const schema = z.string().default('test').optional();
    expect(getZodTypeName(schema)).toBe('string');
  });

  it('should return tuple for tuple types', () => {
    // Create a custom schema that doesn't match any known types
    const schema = z.tuple([z.string(), z.number()]);
    expect(getZodTypeName(schema)).toBe('tuple');
  });

  it('should return unknown for truly unknown types', () => {
    // Create a custom schema that doesn't match any known types
    expect(getZodTypeName(z.unknown())).toBe('unknown');
  });
});
