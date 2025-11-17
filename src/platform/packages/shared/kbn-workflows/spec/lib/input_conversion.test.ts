/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  convertLegacyInputToJsonSchema,
  normalizeInputToJsonSchema,
} from './input_conversion';
import { WorkflowInputSchema } from '../schema';

describe('convertLegacyInputToJsonSchema', () => {
  it('should convert string input to JSON Schema', () => {
    const input = {
      name: 'username',
      type: 'string' as const,
      description: 'User name',
      required: true,
      default: 'john',
    };
    const result = convertLegacyInputToJsonSchema(input);
    expect(result).toEqual({
      name: 'username',
      type: 'json-schema',
      description: 'User name',
      required: true,
      default: 'john',
      schema: { type: 'string' },
    });
  });

  it('should convert number input to JSON Schema', () => {
    const input = {
      name: 'age',
      type: 'number' as const,
      default: 25,
    };
    const result = convertLegacyInputToJsonSchema(input);
    expect(result).toEqual({
      name: 'age',
      type: 'json-schema',
      default: 25,
      schema: { type: 'number' },
    });
  });

  it('should convert boolean input to JSON Schema', () => {
    const input = {
      name: 'enabled',
      type: 'boolean' as const,
      default: true,
    };
    const result = convertLegacyInputToJsonSchema(input);
    expect(result).toEqual({
      name: 'enabled',
      type: 'json-schema',
      default: true,
      schema: { type: 'boolean' },
    });
  });

  it('should convert choice input to JSON Schema with enum', () => {
    const input = {
      name: 'status',
      type: 'choice' as const,
      options: ['active', 'inactive', 'pending'],
      default: 'active',
    };
    const result = convertLegacyInputToJsonSchema(input);
    expect(result).toEqual({
      name: 'status',
      type: 'json-schema',
      default: 'active',
      schema: {
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      },
    });
  });

  it('should convert array input to JSON Schema', () => {
    const input = {
      name: 'tags',
      type: 'array' as const,
      minItems: 1,
      maxItems: 10,
    };
    const result = convertLegacyInputToJsonSchema(input);
    expect(result).toEqual({
      name: 'tags',
      type: 'json-schema',
      schema: {
        type: 'array',
        items: {
          anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        },
        minItems: 1,
        maxItems: 10,
      },
    });
  });

  it('should convert array input without constraints', () => {
    const input = {
      name: 'items',
      type: 'array' as const,
    };
    const result = convertLegacyInputToJsonSchema(input);
    expect(result).toEqual({
      name: 'items',
      type: 'json-schema',
      schema: {
        type: 'array',
        items: {
          anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        },
      },
    });
  });
});

describe('normalizeInputToJsonSchema', () => {
  it('should return json-schema input as-is', () => {
    const input = {
      name: 'fields',
      type: 'json-schema' as const,
      schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
        },
      },
    };
    const result = normalizeInputToJsonSchema(input);
    expect(result).toBe(input);
  });

  it('should convert legacy string input', () => {
    const input = {
      name: 'username',
      type: 'string' as const,
    };
    const result = normalizeInputToJsonSchema(input);
    expect(result.type).toBe('json-schema');
    expect(result.schema).toEqual({ type: 'string' });
  });

  it('should preserve all base properties', () => {
    const input = {
      name: 'test',
      type: 'string' as const,
      description: 'Test description',
      required: true,
      default: 'default value',
    };
    const result = normalizeInputToJsonSchema(input);
    expect(result.name).toBe('test');
    expect(result.description).toBe('Test description');
    expect(result.required).toBe(true);
    expect(result.default).toBe('default value');
  });
});

