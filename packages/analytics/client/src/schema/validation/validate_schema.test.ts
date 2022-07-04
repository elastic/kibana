/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateSchema } from './validate_schema';
import { schemaToIoTs } from './schema_to_io_ts';

describe('validateSchema', () => {
  describe('successful', () => {
    test('valid object', () => {
      expect(() =>
        validateSchema(
          'test source',
          schemaToIoTs({
            an_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
            },
          }),
          { an_object: { a_field: 'test' } }
        )
      ).not.toThrow();
    });
  });
  describe('failed', () => {
    test('object is valid but it has some extra fields not declared in the schema', () => {
      expect(() =>
        validateSchema(
          'test source',
          schemaToIoTs({
            an_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
            },
          }),
          { an_object: { a_field: 'test' }, another_object: { a_field: 'test' } }
        )
      ).toThrowErrorMatchingInlineSnapshot(`
        "Failed to validate payload coming from \\"test source\\":
        	- []: excess key 'another_object' found"
      `);
    });

    test('object is valid but it has some extra nested fields not declared in the schema', () => {
      expect(() =>
        validateSchema(
          'test source',
          schemaToIoTs({
            an_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
            },
          }),
          { an_object: { a_field: 'test', an_extra_field: 'test' } }
        )
      ).toThrowErrorMatchingInlineSnapshot(`
        "Failed to validate payload coming from \\"test source\\":
        	- [an_object]: excess key 'an_extra_field' found"
      `);
    });

    test('the object is not valid because it is missing a key', () => {
      expect(() =>
        validateSchema(
          'test source',
          schemaToIoTs<unknown>({
            an_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
            },
            an_optional_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
              _meta: { optional: true },
            },
          }),
          { another_object: { a_field: 'test' } }
        )
      ).toThrowErrorMatchingInlineSnapshot(`
        "Failed to validate payload coming from \\"test source\\":
        	- [an_object]: {\\"expected\\":\\"{ a_field: string }\\",\\"actual\\":\\"undefined\\",\\"value\\":\\"undefined\\"}"
      `);
    });

    test('lists multiple errors', () => {
      expect(() =>
        validateSchema(
          'test source',
          schemaToIoTs<unknown>({
            an_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
            },
            an_optional_object: {
              properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
              _meta: { optional: true },
            },
          }),
          {
            an_object: { a_field: 'test', an_extra_field: 'test' },
            an_optional_object: {},
            another_object: { a_field: 'test' },
          }
        )
      ).toThrowErrorMatchingInlineSnapshot(`
        "Failed to validate payload coming from \\"test source\\":
        	- [an_object]: excess key 'an_extra_field' found
        	- [an_optional_object.a_field]: {\\"expected\\":\\"string\\",\\"actual\\":\\"undefined\\",\\"value\\":\\"undefined\\"}"
      `);
    });
  });
});
