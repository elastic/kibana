/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { generateSampleFromJsonSchema } from './generate_sample_from_json_schema';

describe('generateSampleFromJsonSchema', () => {
  describe('default values', () => {
    it('returns the schema default when present', () => {
      expect(generateSampleFromJsonSchema({ type: 'string', default: 'hello' })).toBe('hello');
    });

    it('returns a numeric default', () => {
      expect(generateSampleFromJsonSchema({ type: 'number', default: 42 })).toBe(42);
    });

    it('returns a boolean default', () => {
      expect(generateSampleFromJsonSchema({ type: 'boolean', default: true })).toBe(true);
    });

    it('returns an object default', () => {
      const def = { key: 'value' };
      expect(generateSampleFromJsonSchema({ type: 'object', default: def })).toEqual(def);
    });
  });

  describe('string type', () => {
    it('returns "string" for a plain string', () => {
      expect(generateSampleFromJsonSchema({ type: 'string' })).toBe('string');
    });

    it('returns "user@example.com" for format: email', () => {
      expect(generateSampleFromJsonSchema({ type: 'string', format: 'email' })).toBe(
        'user@example.com'
      );
    });
  });

  describe('numeric types', () => {
    it('returns 0 for number', () => {
      expect(generateSampleFromJsonSchema({ type: 'number' })).toBe(0);
    });

    it('returns 0 for integer', () => {
      expect(generateSampleFromJsonSchema({ type: 'integer' })).toBe(0);
    });
  });

  describe('boolean type', () => {
    it('returns false', () => {
      expect(generateSampleFromJsonSchema({ type: 'boolean' })).toBe(false);
    });
  });

  describe('array type', () => {
    it('returns an array with one sample item when items schema is provided', () => {
      const schema: JSONSchema7 = { type: 'array', items: { type: 'string' } };
      expect(generateSampleFromJsonSchema(schema)).toEqual(['string']);
    });

    it('returns an empty array when no items schema', () => {
      expect(generateSampleFromJsonSchema({ type: 'array' })).toEqual([]);
    });

    it('handles nested array items', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { type: 'array', items: { type: 'number' } },
      };
      expect(generateSampleFromJsonSchema(schema)).toEqual([[0]]);
    });
  });

  describe('object type', () => {
    it('includes only required properties when no defaults', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          optional: { type: 'boolean' },
        },
        required: ['name', 'age'],
      };
      expect(generateSampleFromJsonSchema(schema)).toEqual({ name: 'string', age: 0 });
    });

    it('includes properties with defaults even if not required', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          color: { type: 'string', default: 'blue' },
          size: { type: 'number' },
        },
      };
      expect(generateSampleFromJsonSchema(schema)).toEqual({ color: 'blue' });
    });

    it('returns an empty object when no properties', () => {
      expect(generateSampleFromJsonSchema({ type: 'object' })).toEqual({});
    });

    it('handles nested objects', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              city: { type: 'string' },
            },
            required: ['city'],
          },
        },
        required: ['address'],
      };
      expect(generateSampleFromJsonSchema(schema)).toEqual({
        address: { city: 'string' },
      });
    });
  });

  describe('unknown / unhandled type', () => {
    it('returns undefined for null type', () => {
      expect(generateSampleFromJsonSchema({ type: 'null' })).toBeUndefined();
    });

    it('returns undefined for no type', () => {
      expect(generateSampleFromJsonSchema({})).toBeUndefined();
    });
  });
});
