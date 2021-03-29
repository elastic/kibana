/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AllowedSchemaTypes } from 'src/plugins/usage_collection/server';
import { convertSchemaToIoTs } from './schema_to_io_ts';
import type { TelemetryRootSchema } from './types';

describe(`convertSchemaToIoTs`, () => {
  test('fail with anything other than an object', () => {
    // @ts-expect-error
    expect(() => convertSchemaToIoTs(null)).toThrow();
  });
  test('invalid type => errors with malformed schema', () => {
    expect(() =>
      convertSchemaToIoTs({
        // @ts-expect-error Non-valid type
        an_invalid_field: { type: 'invalid', _meta: { description: 'Test description' } },
      })
    ).toThrow(/Malformed schema/);
  });
  test('array type missing `items` => errors with malformed schema', () => {
    expect(() =>
      convertSchemaToIoTs({
        // @ts-expect-error Non-valid array-construct
        an_invalid_field: { type: 'array' },
      })
    ).toThrow(/Malformed schema/);
  });
  test('minimal schemas and empty value => pass', () => {
    const validator = convertSchemaToIoTs({});
    expect(validator.is({})).toBe(true);
  });
  test('value has fields not defined in the schema => fail', () => {
    const validator = convertSchemaToIoTs({});
    expect(validator.is({ version: 'some-version' })).toBe(false);
    expect(validator.is({ an_array: [{ docs: { missing: 1 } }] })).toBe(false);
  });
  test('support optional fields', () => {
    const validator = convertSchemaToIoTs({
      an_optional_field: {
        type: 'keyword',
        _meta: {
          description: 'An optional field',
          optional: true,
        },
      },
      an_optional_obj: {
        _meta: { optional: true },
        properties: {
          other_field: { type: 'short', _meta: { description: 'Test description' } },
        },
      },
      an_optional_array: {
        type: 'array',
        items: { type: 'short', _meta: { description: 'Test description' } },
        _meta: { optional: true },
      },
    });
    expect(validator.is({})).toBe(true);
  });
  test('value has nested-fields not defined in the schema => fail', () => {
    const schemas: TelemetryRootSchema[] = [
      {
        an_array: {
          type: 'array',
          _meta: { description: 'Test description' },
          items: {
            properties: {},
          },
        },
      },
      {
        an_array: {
          type: 'array',
          _meta: { description: 'Test description' },
          items: {
            properties: { docs: { properties: {} } },
          },
        },
      },
    ];
    schemas.forEach((schema) => {
      const validator = convertSchemaToIoTs(schema);
      expect(validator.is({ an_array: [{ docs: { missing: 1 } }] })).toBe(false);
    });
  });
  test('value has nested-fields defined in the schema, but with wrong type => fail', () => {
    const validator = convertSchemaToIoTs({
      an_array: {
        type: 'array',
        items: {
          properties: {
            docs: {
              properties: {
                field: { type: 'short', _meta: { description: 'Test description' } },
              },
            },
          },
        },
      },
    });
    expect(validator.is({ an_array: [{ docs: { field: 'abc' } }] })).toBe(false);
  });
  test.each([
    'boolean',
    'byte',
    'double',
    'float',
    'integer',
    'long',
    'short',
  ] as AllowedSchemaTypes[])('Expected type %s, but got string', (type) => {
    const validator = convertSchemaToIoTs({
      a_field: { type, _meta: { description: 'Test description' } },
    });
    expect(validator.is({ a_field: 'abc' })).toBe(false);
  });
  test.each(['keyword', 'text', 'date'] as AllowedSchemaTypes[])(
    'Expected type %s, but got number',
    (type) => {
      const validator = convertSchemaToIoTs({
        a_field: { type, _meta: { description: 'Test description' } },
      });
      expect(validator.is({ a_field: 1234 })).toBe(false);
    }
  );
  test('Numbers accept null as values', () => {
    const validator = convertSchemaToIoTs({
      a_field: { type: 'short', _meta: { description: 'Test description' } },
    });
    expect(validator.is({ a_field: null })).toBe(true);
  });
  test('Support DYNAMIC_KEY', () => {
    const validator = convertSchemaToIoTs({
      a_field: {
        properties: { DYNAMIC_KEY: { type: 'short', _meta: { description: 'Test description' } } },
      },
    });
    expect(validator.is({ a_field: { some_key: 1234 } })).toBe(true);
  });
  test('Support DYNAMIC_KEY + known props', () => {
    const validator = convertSchemaToIoTs({
      a_field: {
        properties: {
          DYNAMIC_KEY: { type: 'short', _meta: { description: 'Test description' } },
          known_prop: { type: 'short', _meta: { description: 'Test description' } },
        },
      },
    });
    expect(validator.is({ a_field: { some_key: 1234, known_prop: 1234 } })).toBe(true);
  });
  test('value has nested-fields defined in the schema => succeed', () => {
    const validator = convertSchemaToIoTs({
      an_array: {
        type: 'array',
        items: {
          properties: {
            docs: {
              properties: {
                field: { type: 'short', _meta: { description: 'Test description' } },
              },
            },
          },
        },
      },
    });
    expect(validator.is({ an_array: [{ docs: { field: 1 } }] })).toBe(true);
  });

  test('allow pass_through properties', () => {
    const validator = convertSchemaToIoTs({
      im_only_passing_through_data: {
        type: 'pass_through',
        _meta: { description: 'Test description' },
      },
    });
    expect(validator.is({ im_only_passing_through_data: [{ docs: { field: 1 } }] })).toBe(true);
  });
});
