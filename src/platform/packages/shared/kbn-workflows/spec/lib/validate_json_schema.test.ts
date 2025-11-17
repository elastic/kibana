/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidJsonSchema } from './validate_json_schema';

describe('isValidJsonSchema', () => {
  it('should validate a simple string schema', () => {
    const schema = { type: 'string' };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a number schema', () => {
    const schema = { type: 'number' };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a boolean schema', () => {
    const schema = { type: 'boolean' };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate an object schema with properties', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string' },
        name: { type: 'string' },
      },
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a nested object schema', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            routing: {
              type: 'object',
              properties: {
                shard: { type: 'number' },
                primary: { type: 'boolean' },
              },
            },
          },
        },
      },
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate an array schema', () => {
    const schema = {
      type: 'array',
      items: { type: 'string' },
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a schema with enum', () => {
    const schema = {
      type: 'string',
      enum: ['option1', 'option2', 'option3'],
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a schema with required fields', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['email', 'name'],
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a schema with anyOf', () => {
    const schema = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a schema with oneOf', () => {
    const schema = {
      oneOf: [{ type: 'string' }, { type: 'number' }],
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should validate a schema with allOf', () => {
    const schema = {
      allOf: [{ type: 'object' }, { properties: { name: { type: 'string' } } }],
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });

  it('should reject null', () => {
    expect(isValidJsonSchema(null)).toBe(false);
  });

  it('should reject undefined', () => {
    expect(isValidJsonSchema(undefined)).toBe(false);
  });

  it('should reject a string', () => {
    expect(isValidJsonSchema('not a schema')).toBe(false);
  });

  it('should reject a number', () => {
    expect(isValidJsonSchema(123)).toBe(false);
  });

  it('should reject an empty object without schema properties', () => {
    expect(isValidJsonSchema({})).toBe(false);
  });

  it('should reject an object with invalid type', () => {
    const schema = { type: 'invalid-type' };
    expect(isValidJsonSchema(schema)).toBe(false);
  });

  it('should validate a complex nested schema from the example', () => {
    const schema = {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
        name: {
          type: 'string',
        },
        metadata: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
            },
            routing: {
              type: 'object',
              properties: {
                shard: {
                  type: 'number',
                },
                primary: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
      required: ['email', 'name'],
    };
    expect(isValidJsonSchema(schema)).toBe(true);
  });
});

