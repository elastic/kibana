/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';
import { RouteValidationError } from '@kbn/core-http-server';
import { RouteValidator } from './validator';

describe('Router validator', () => {
  it('should validate and infer the type from a function', () => {
    const validator = RouteValidator.from({
      params: ({ foo }, validationResult) => {
        if (typeof foo === 'string') {
          return validationResult.ok({ foo });
        }
        return validationResult.badRequest('Not a string', ['foo']);
      },
    });
    expect(validator.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(validator.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => validator.getParams({ foo: 1 })).toThrowError('[foo]: Not a string');
    expect(() => validator.getParams({})).toThrowError('[foo]: Not a string');

    expect(() => validator.getParams(undefined)).toThrowError(
      "Cannot destructure property 'foo' of 'undefined' as it is undefined."
    );
    expect(() => validator.getParams({}, 'myField')).toThrowError('[myField.foo]: Not a string');

    expect(validator.getBody(undefined)).toStrictEqual({});
    expect(validator.getQuery(undefined)).toStrictEqual({});
  });

  it('should validate and infer the type from a function that does not use the resolver', () => {
    const validator = RouteValidator.from({
      params: (data) => {
        if (typeof data.foo === 'string') {
          return { value: { foo: data.foo as string } };
        }
        return { error: new RouteValidationError('Not a string', ['foo']) };
      },
    });
    expect(validator.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(validator.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => validator.getParams({ foo: 1 })).toThrowError('[foo]: Not a string');
    expect(() => validator.getParams({})).toThrowError('[foo]: Not a string');

    expect(() => validator.getParams(undefined)).toThrowError(
      `Cannot read properties of undefined (reading 'foo')`
    );
    expect(() => validator.getParams({}, 'myField')).toThrowError('[myField.foo]: Not a string');

    expect(validator.getBody(undefined)).toStrictEqual({});
    expect(validator.getQuery(undefined)).toStrictEqual({});
  });

  it('should validate and infer the type from a config-schema ObjectType', () => {
    const schemaValidation = RouteValidator.from({
      params: schema.object({
        foo: schema.string(),
      }),
    });

    expect(schemaValidation.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(schemaValidation.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => schemaValidation.getParams({ foo: 1 })).toThrowError(
      '[foo]: expected value of type [string] but got [number]'
    );
    expect(() => schemaValidation.getParams({})).toThrowError(
      '[foo]: expected value of type [string] but got [undefined]'
    );
    expect(() => schemaValidation.getParams(undefined)).toThrowError(
      '[foo]: expected value of type [string] but got [undefined]'
    );
    expect(() => schemaValidation.getParams({}, 'myField')).toThrowError(
      '[myField.foo]: expected value of type [string] but got [undefined]'
    );
  });

  it('should validate and infer the type from a zod-schema ObjectType', () => {
    const schemaValidation = RouteValidator.from({
      params: z.object({
        foo: z.string(),
      }),
    });

    expect(schemaValidation.getParams({ foo: 'bar' })).toStrictEqual({ foo: 'bar' });
    expect(schemaValidation.getParams({ foo: 'bar' }).foo.toUpperCase()).toBe('BAR'); // It knows it's a string! :)
    expect(() => schemaValidation.getParams({ foo: 1 })).toThrowError(
      /Expected string, received number/
    );
    expect(() => schemaValidation.getParams({})).toThrowError(/Required/);
    expect(() => schemaValidation.getParams(undefined)).toThrowError(/Required/);
    expect(() => schemaValidation.getParams({}, 'myField')).toThrowError(/Required/);
  });

  describe('query parameter array handling', () => {
    it('should convert single string value to array when schema expects array', () => {
      const validator = RouteValidator.from({
        query: schema.object({
          fields: schema.arrayOf(schema.string()),
        }),
      });

      // Single value should be converted to array
      const result = validator.getQuery({ fields: 'id' });
      expect(result).toStrictEqual({ fields: ['id'] });
    });

    it('should preserve array values when schema expects array', () => {
      const validator = RouteValidator.from({
        query: schema.object({
          fields: schema.arrayOf(schema.string()),
        }),
      });

      // Array values should remain as arrays
      const result = validator.getQuery({ fields: ['id', 'title'] });
      expect(result).toStrictEqual({ fields: ['id', 'title'] });
    });

    it('should handle mixed query parameters with both array and non-array fields', () => {
      const validator = RouteValidator.from({
        query: schema.object({
          fields: schema.arrayOf(schema.string()),
          search: schema.string(),
          tags: schema.arrayOf(schema.string()),
        }),
      });

      // Test with single values for array fields and regular field
      const result = validator.getQuery({
        fields: 'id',
        search: 'test',
        tags: 'important'
      });
      expect(result).toStrictEqual({
        fields: ['id'],
        search: 'test',
        tags: ['important']
      });
    });

    it('should handle empty values correctly', () => {
      const validator = RouteValidator.from({
        query: schema.object({
          fields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      });

      // Empty object should work
      const result1 = validator.getQuery({});
      expect(result1).toStrictEqual({ fields: undefined });

      // Undefined fields should work
      const result2 = validator.getQuery({ fields: undefined });
      expect(result2).toStrictEqual({ fields: undefined });
    });

    it('should not convert non-string values to arrays', () => {
      const validator = RouteValidator.from({
        query: schema.object({
          numbers: schema.arrayOf(schema.number()),
        }),
      });

      // Number value should remain as number (and validation will handle if it's wrong)
      expect(() => validator.getQuery({ numbers: 42 })).toThrowError();
    });

    it('should preserve original behavior for non-object schemas', () => {
      const validator = RouteValidator.from({
        query: schema.arrayOf(schema.string()),
      });

      // Should not break when query schema is not an object
      expect(() => validator.getQuery('single-value')).toThrowError();

      const result = validator.getQuery(['value1', 'value2']);
      expect(result).toStrictEqual(['value1', 'value2']);
    });

    it('should handle validation errors gracefully', () => {
      const validator = RouteValidator.from({
        query: schema.object({
          fields: schema.arrayOf(schema.string()),
        }),
      });

      // Invalid data types should still throw appropriate errors
      expect(() => validator.getQuery({ fields: 123 })).toThrowError();
      expect(() => validator.getQuery({ fields: null })).toThrowError();
      expect(() => validator.getQuery({ fields: {} })).toThrowError();
    });
  });

  it('should support required config fields', () => {
    const validator = RouteValidator.from({
      params: schema.object({ requiredField: schema.string() }),
      body: schema.object({
        body: schema.arrayOf(schema.string()),
        bool: schema.boolean(),
      }),
    });

    expect(validator.getParams({ requiredField: 'any' })).toStrictEqual({
      requiredField: 'any',
    });
    expect(validator.getBody({ body: ['any'], bool: true })).toStrictEqual({
      body: ['any'],
      bool: true,
    });
  });

  it('should support optional config fields', () => {
    const validator = RouteValidator.from({
      params: schema.object({ optionalField: schema.maybe(schema.string()) }),
      body: schema.object({
        body: schema.arrayOf(schema.number()),
        bool: schema.boolean(),
      }),
    });

    expect(validator.getParams({ optionalField: 'any' })).toStrictEqual({
      optionalField: 'any',
    });
    expect(validator.getParams({})).toStrictEqual({ optionalField: undefined });
    expect(validator.getBody({ body: [1, 2, 3], bool: true })).toStrictEqual({
      body: [1, 2, 3],
      bool: true,
    });
  });

  it('should support required config fields if all required fields are specified', () => {
    const validator = RouteValidator.from({
      body: schema.object({
        body: schema.arrayOf(schema.object({ foo: schema.string() })),
      }),
    });

    expect(() => validator.getBody({})).toThrowError(
      '[body]: expected value of type [array] but got [undefined]'
    );
    expect(() => validator.getBody({ body: [{ bar: 'baz' }] })).toThrowError(
      '[body.0.foo]: expected value of type [string] but got [undefined]'
    );
    expect(validator.getBody({ body: [{ foo: 'bar' }] })).toStrictEqual({
      body: [{ foo: 'bar' }],
    });
  });

  it('config schema with defaults can be used for validation and throw errors when value does not match schema type', () => {
    const validator = RouteValidator.from({
      body: schema.object({
        body: schema.arrayOf(schema.number()),
        bool: schema.boolean(),
      }),
    });

    expect(() => validator.getBody({ body: ['1', '2'], bool: true })).toThrowError(
      '[body.0]: expected value of type [number] but got [string]'
    );
    expect(() => validator.getBody({ body: [1, 2], bool: 'true' })).toThrowError(
      '[bool]: expected value of type [boolean] but got [string]'
    );
  });

  it('should support config schema options', () => {
    const validator = RouteValidator.from({
      params: schema.object({ foo: schema.string() }),
      body: schema.object({
        body: schema.arrayOf(schema.number()),
        bool: schema.boolean({ defaultValue: true }),
      }),
    });

    expect(validator.getBody({ body: [1, 2, 3] })).toStrictEqual({
      body: [1, 2, 3],
      bool: true,
    });
  });

  it('should turn result into `any` if no schema is declared', () => {
    const validator = RouteValidator.from({ params: undefined });

    expect(validator.getParams('text')).toStrictEqual({});
    expect(validator.getParams([])).toStrictEqual({});
    expect(validator.getParams(1234)).toStrictEqual({});
    expect(validator.getParams({})).toStrictEqual({});
  });

  it('should never allow undefined even if no validation is declared', () => {
    const validator = RouteValidator.from({ params: undefined });

    expect(validator.getParams(undefined)).toStrictEqual({});
  });

  it('should never allow null even if no validation is declared', () => {
    const validator = RouteValidator.from({ params: undefined });

    expect(validator.getParams(null)).toStrictEqual({});
  });
});
