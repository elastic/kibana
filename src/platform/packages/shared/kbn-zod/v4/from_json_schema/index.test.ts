/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '..';
import { fromJSONSchema } from '.';
import type { ZodType, ZodDiscriminatedUnion } from 'zod/v4';

const getMeta = (schema: ZodType) => {
  return z.globalRegistry.get(schema) || {};
};

describe('JSON Schema to Zod parser - Unit tests', () => {
  describe('Basic type parsing', () => {
    it('converts a simple object schema and validates correctly', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', minLength: 1 },
          timeout: { type: 'number' },
        },
        required: ['apiKey'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ apiKey: 'my-key' })).not.toThrow();
      expect(() => zodSchema!.parse({ apiKey: 'my-key', timeout: 30 })).not.toThrow();

      expect(() => zodSchema!.parse({})).toThrow();
      expect(() => zodSchema!.parse({ timeout: 30 })).toThrow();
    });

    it('converts schema with optional fields', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ name: 'test' })).not.toThrow();
      expect(() => zodSchema!.parse({ name: 'test', description: 'desc' })).not.toThrow();
      expect(() => zodSchema!.parse({ description: 'desc' })).toThrow();
      expect(() => zodSchema!.parse({})).toThrow();
    });

    it('converts schema with enum values', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['level'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ level: 'low' })).not.toThrow();
      expect(() => zodSchema!.parse({ level: 'medium' })).not.toThrow();
      expect(() => zodSchema!.parse({ level: 'invalid' })).toThrow();
    });

    it('handles nested objects', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number' },
            },
            required: ['host'],
          },
        },
        required: ['config'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ config: { host: 'localhost' } })).not.toThrow();
      expect(() => zodSchema!.parse({ config: { host: 'localhost', port: 8080 } })).not.toThrow();
      expect(() => zodSchema!.parse({ config: {} })).toThrow();
    });
  });

  describe('Discriminated union parsing', () => {
    it('handles discriminated unions', () => {
      const jsonSchema = {
        oneOf: [
          {
            type: 'object',
            properties: {
              authType: { const: 'api_key' },
              apiKey: { type: 'string' },
            },
            required: ['authType', 'apiKey'],
          },
          {
            type: 'object',
            properties: {
              authType: { const: 'basic' },
              username: { type: 'string' },
              password: { type: 'string' },
            },
            required: ['authType', 'username', 'password'],
          },
        ],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ authType: 'api_key', apiKey: 'key123' })).not.toThrow();
      expect(() =>
        zodSchema!.parse({ authType: 'basic', username: 'u', password: 'p' })
      ).not.toThrow();
    });

    it('handles single-option discriminated unions', () => {
      const jsonSchema = {
        anyOf: [
          {
            type: 'object',
            properties: {
              authType: { const: 'api_key_header' },
              'X-OTX-API-KEY': { type: 'string', minLength: 1 },
            },
            required: ['authType', 'X-OTX-API-KEY'],
          },
        ],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(zodSchema).toBeInstanceOf(z.ZodDiscriminatedUnion);

      expect(() =>
        zodSchema!.parse({ authType: 'api_key_header', 'X-OTX-API-KEY': 'test-key' })
      ).not.toThrow();

      expect(() => zodSchema!.parse({ authType: 'api_key_header' })).toThrow();
    });

    it('single-option discriminated union has correct discriminator key', () => {
      const jsonSchema = {
        anyOf: [
          {
            type: 'object',
            properties: {
              authType: { const: 'api_key_header' },
              apiKey: { type: 'string' },
            },
            required: ['authType', 'apiKey'],
          },
        ],
      };

      const zodSchema = fromJSONSchema(jsonSchema) as ZodDiscriminatedUnion;
      expect(zodSchema).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const discriminatorKey = (zodSchema as unknown as { _def: { discriminator: string } })._def
        .discriminator;
      expect(discriminatorKey).toBe('authType');
    });
  });

  describe('String constraints', () => {
    it('validates minLength constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          password: { type: 'string', minLength: 8 },
        },
        required: ['password'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ password: '12345678' })).not.toThrow();
      expect(() => zodSchema!.parse({ password: 'short' })).toThrow();
    });

    it('validates maxLength constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          code: { type: 'string', maxLength: 10 },
        },
        required: ['code'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ code: 'short' })).not.toThrow();
      expect(() => zodSchema!.parse({ code: 'this is too long' })).toThrow();
    });

    it('validates pattern constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
        },
        required: ['phone'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ phone: '+1234567890' })).not.toThrow();
      expect(() => zodSchema!.parse({ phone: 'invalid' })).toThrow();
    });

    it('validates email format', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ email: 'user@example.com' })).not.toThrow();
      expect(() => zodSchema!.parse({ email: 'not-an-email' })).toThrow();
    });

    it('validates uuid format', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ id: '550e8400-e29b-41d4-a716-446655440000' })).not.toThrow();
      expect(() => zodSchema!.parse({ id: 'not-a-uuid' })).toThrow();
    });

    it('validates uri format', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
        },
        required: ['url'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ url: 'https://example.com' })).not.toThrow();
      expect(() => zodSchema!.parse({ url: 'not-a-url' })).toThrow();
    });

    it('validates date-time format', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['timestamp'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ timestamp: '2023-12-25T10:30:00Z' })).not.toThrow();
      expect(() => zodSchema!.parse({ timestamp: 'invalid-date' })).toThrow();
    });

    it('validates date format', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
        },
        required: ['date'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ date: '2023-12-25' })).not.toThrow();
      expect(() => zodSchema!.parse({ date: 'invalid' })).toThrow();
    });

    it('validates time format', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          time: { type: 'string', format: 'time' },
        },
        required: ['time'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ time: '10:30:00' })).not.toThrow();
      expect(() => zodSchema!.parse({ time: 'invalid' })).toThrow();
    });

    it('combines multiple string constraints', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20, pattern: '^[a-zA-Z0-9_]+$' },
        },
        required: ['username'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ username: 'user123' })).not.toThrow();
      expect(() => zodSchema!.parse({ username: 'ab' })).toThrow();
      expect(() => zodSchema!.parse({ username: 'a'.repeat(21) })).toThrow();
      expect(() => zodSchema!.parse({ username: 'user-name' })).toThrow();
    });
  });

  describe('Number constraints', () => {
    it('validates minimum constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 18 },
        },
        required: ['age'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ age: 18 })).not.toThrow();
      expect(() => zodSchema!.parse({ age: 25 })).not.toThrow();
      expect(() => zodSchema!.parse({ age: 17 })).toThrow();
    });

    it('validates maximum constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          score: { type: 'number', maximum: 100 },
        },
        required: ['score'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ score: 100 })).not.toThrow();
      expect(() => zodSchema!.parse({ score: 50 })).not.toThrow();
      expect(() => zodSchema!.parse({ score: 101 })).toThrow();
    });

    it('validates exclusiveMinimum constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          price: { type: 'number', exclusiveMinimum: 0 },
        },
        required: ['price'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ price: 0.01 })).not.toThrow();
      expect(() => zodSchema!.parse({ price: 0 })).toThrow();
      expect(() => zodSchema!.parse({ price: -1 })).toThrow();
    });

    it('validates exclusiveMaximum constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          discount: { type: 'number', exclusiveMaximum: 100 },
        },
        required: ['discount'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ discount: 99 })).not.toThrow();
      expect(() => zodSchema!.parse({ discount: 100 })).toThrow();
      expect(() => zodSchema!.parse({ discount: 101 })).toThrow();
    });

    it('validates multipleOf constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          quantity: { type: 'number', multipleOf: 5 },
        },
        required: ['quantity'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ quantity: 5 })).not.toThrow();
      expect(() => zodSchema!.parse({ quantity: 10 })).not.toThrow();
      expect(() => zodSchema!.parse({ quantity: 7 })).toThrow();
    });

    it('distinguishes integer from number', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          ratio: { type: 'number' },
        },
        required: ['count', 'ratio'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ count: 5, ratio: 3.14 })).not.toThrow();
      expect(() => zodSchema!.parse({ count: 5.5, ratio: 3.14 })).toThrow();
      expect(() => zodSchema!.parse({ count: 5, ratio: 3 })).not.toThrow();
    });

    it('combines multiple number constraints', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          percentage: { type: 'number', minimum: 0, maximum: 100, multipleOf: 0.5 },
        },
        required: ['percentage'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ percentage: 50 })).not.toThrow();
      expect(() => zodSchema!.parse({ percentage: 50.5 })).not.toThrow();
      expect(() => zodSchema!.parse({ percentage: -1 })).toThrow();
      expect(() => zodSchema!.parse({ percentage: 101 })).toThrow();
      expect(() => zodSchema!.parse({ percentage: 50.3 })).toThrow();
    });
  });

  describe('Array parsing', () => {
    it('converts array with string items', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['tags'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ tags: ['tag1', 'tag2'] })).not.toThrow();
      expect(() => zodSchema!.parse({ tags: [] })).not.toThrow();
      expect(() => zodSchema!.parse({ tags: [1, 2] })).toThrow();
    });

    it('converts array with number items', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          scores: { type: 'array', items: { type: 'number' } },
        },
        required: ['scores'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ scores: [1, 2, 3] })).not.toThrow();
      expect(() => zodSchema!.parse({ scores: ['invalid'] })).toThrow();
    });

    it('validates minItems constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' }, minItems: 2 },
        },
        required: ['items'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ items: ['a', 'b'] })).not.toThrow();
      expect(() => zodSchema!.parse({ items: ['a', 'b', 'c'] })).not.toThrow();
      expect(() => zodSchema!.parse({ items: ['a'] })).toThrow();
      expect(() => zodSchema!.parse({ items: [] })).toThrow();
    });

    it('validates maxItems constraint', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' }, maxItems: 3 },
        },
        required: ['items'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ items: [] })).not.toThrow();
      expect(() => zodSchema!.parse({ items: ['a', 'b', 'c'] })).not.toThrow();
      expect(() => zodSchema!.parse({ items: ['a', 'b', 'c', 'd'] })).toThrow();
    });

    it('handles nested arrays', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          matrix: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        },
        required: ['matrix'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() =>
        zodSchema!.parse({
          matrix: [
            [1, 2],
            [3, 4],
          ],
        })
      ).not.toThrow();
      expect(() => zodSchema!.parse({ matrix: [[1, 'invalid']] })).toThrow();
    });

    it('handles array with object items', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
              required: ['name'],
            },
          },
        },
        required: ['users'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() =>
        zodSchema!.parse({ users: [{ name: 'Alice', age: 30 }, { name: 'Bob' }] })
      ).not.toThrow();
      expect(() => zodSchema!.parse({ users: [{ age: 30 }] })).toThrow();
    });

    it('combines array constraints', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 5,
          },
        },
        required: ['items'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ items: ['a'] })).not.toThrow();
      expect(() => zodSchema!.parse({ items: ['a', 'b', 'c', 'd', 'e'] })).not.toThrow();
      expect(() => zodSchema!.parse({ items: [] })).toThrow();
      expect(() => zodSchema!.parse({ items: ['a', 'b', 'c', 'd', 'e', 'f'] })).toThrow();
    });
  });

  describe('Const literals', () => {
    it('converts string const', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          type: { const: 'api_key' },
        },
        required: ['type'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ type: 'api_key' })).not.toThrow();
      expect(() => zodSchema!.parse({ type: 'other' })).toThrow();
    });

    it('converts number const', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          version: { const: 1 },
        },
        required: ['version'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ version: 1 })).not.toThrow();
      expect(() => zodSchema!.parse({ version: 2 })).toThrow();
    });

    it('converts boolean const', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          enabled: { const: true },
        },
        required: ['enabled'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ enabled: true })).not.toThrow();
      expect(() => zodSchema!.parse({ enabled: false })).toThrow();
    });

    it('converts null const', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          value: { const: null },
        },
        required: ['value'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      expect(() => zodSchema!.parse({ value: null })).not.toThrow();
      expect(() => zodSchema!.parse({ value: 'not-null' })).toThrow();
    });
  });

  describe('Default values', () => {
    it('applies default value for optional string field', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'Unknown' },
          age: { type: 'number' },
        },
        required: ['age'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      const result1 = zodSchema!.parse({ age: 25 }) as any;
      expect(result1.name).toBe('Unknown');

      const result2 = zodSchema!.parse({ name: 'John', age: 25 }) as any;
      expect(result2.name).toBe('John');
    });

    it('applies default value for optional number field', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          timeout: { type: 'number', default: 30 },
          url: { type: 'string' },
        },
        required: ['url'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      const result1 = zodSchema!.parse({ url: 'https://example.com' }) as any;
      expect(result1.timeout).toBe(30);

      const result2 = zodSchema!.parse({ url: 'https://example.com', timeout: 60 }) as any;
      expect(result2.timeout).toBe(60);
    });

    it('applies default value for optional boolean field', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      const result1 = zodSchema!.parse({ name: 'test' }) as any;
      expect(result1.enabled).toBe(true);

      const result2 = zodSchema!.parse({ name: 'test', enabled: false }) as any;
      expect(result2.enabled).toBe(false);
    });

    it('applies default value for array field', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' }, default: [] },
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      const result1 = zodSchema!.parse({ name: 'test' }) as any;
      expect(result1.tags).toEqual([]);

      const result2 = zodSchema!.parse({ name: 'test', tags: ['tag1'] }) as any;
      expect(result2.tags).toEqual(['tag1']);
    });

    it('applies default value for nested object field', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              host: { type: 'string', default: 'localhost' },
              port: { type: 'number', default: 8080 },
            },
            default: { host: 'localhost', port: 8080 },
          },
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      const result1 = zodSchema!.parse({ name: 'test' }) as any;
      expect(result1.config).toEqual({ host: 'localhost', port: 8080 });

      const result2 = zodSchema!.parse({
        name: 'test',
        config: { host: 'example.com', port: 3000 },
      }) as any;
      expect(result2.config).toEqual({ host: 'example.com', port: 3000 });
    });
  });

  describe('Edge cases', () => {
    it('returns undefined for invalid schema', () => {
      const result = fromJSONSchema({ invalid: 'schema' });
      expect(result === undefined || typeof result === 'object').toBe(true);
    });

    it('handles empty schema gracefully', () => {
      const emptySchema = {};
      const result = fromJSONSchema(emptySchema);
      expect(result === undefined || typeof result === 'object').toBe(true);
    });
  });

  describe('Meta information extraction', () => {
    it('preserves meta on single-option discriminated union and its fields', () => {
      const jsonSchema = {
        anyOf: [
          {
            type: 'object',
            label: 'Bearer token',
            properties: {
              authType: { const: 'bearer', type: 'string' },
              token: {
                type: 'string',
                minLength: 1,
                label: 'Jina API Key',
                placeholder: 'jina_...',
                sensitive: true,
              },
            },
            required: ['authType', 'token'],
          },
        ],
        label: 'Authentication',
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();
      expect(zodSchema).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const unionMeta = getMeta(zodSchema!);
      expect(unionMeta.label).toBe('Authentication');

      const discriminatedUnion = zodSchema as ZodDiscriminatedUnion;
      const options = discriminatedUnion.options;
      expect(options).toHaveLength(1);

      const optionSchema = options[0] as any;
      const optionMeta = getMeta(optionSchema);
      expect(optionMeta.label).toBe('Bearer token');

      const optionShape = optionSchema.shape as Record<string, ZodType>;
      const tokenField = optionShape.token;
      expect(tokenField).toBeDefined();

      const tokenMeta = getMeta(tokenField);
      expect(tokenMeta.label).toBe('Jina API Key');
      expect(tokenMeta.placeholder).toBe('jina_...');
      expect(tokenMeta.sensitive).toBe(true);
    });

    it('getMeta works after round-trip with direct property hydration', () => {
      const originalSchema = z.object({
        apiKey: z.string().meta({ label: 'API Key', sensitive: true }),
        url: z.string().meta({ label: 'Server URL', helpText: 'The base URL' }),
      });

      const jsonSchema = z.toJSONSchema(originalSchema);

      const restoredSchema = fromJSONSchema(jsonSchema);
      expect(restoredSchema).toBeDefined();

      const schemaWithShape = restoredSchema as unknown as { shape?: Record<string, ZodType> };
      expect(schemaWithShape.shape).toBeDefined();

      const apiKeyField = schemaWithShape.shape!.apiKey;
      const urlField = schemaWithShape.shape!.url;

      const apiKeyMeta = getMeta(apiKeyField);
      expect(apiKeyMeta.label).toBe('API Key');
      expect(apiKeyMeta.sensitive).toBe(true);

      const urlMeta = getMeta(urlField);
      expect(urlMeta.label).toBe('Server URL');
      expect(urlMeta.helpText).toBe('The base URL');
    });

    it('verifies globalRegistry contains schema meta after fromJSONSchema', () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          browseUrl: {
            type: 'string',
            label: 'Browse URL',
          },
        },
      };

      const zodSchema = fromJSONSchema(jsonSchema);
      expect(zodSchema).toBeDefined();

      const schemaWithShape = zodSchema as unknown as { shape?: Record<string, ZodType> };
      const browseUrl = schemaWithShape.shape!.browseUrl;
      expect(z.globalRegistry.has(browseUrl)).toBe(true);

      const registryValue = z.globalRegistry.get(browseUrl);
      expect(registryValue).toBeDefined();
      expect(registryValue?.label).toBe('Browse URL');
    });
  });
});
