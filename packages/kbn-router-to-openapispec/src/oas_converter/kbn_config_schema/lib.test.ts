/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, metaFields } from '@kbn/config-schema';
import { set } from '@kbn/safer-lodash-set';
import { omit } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { is, tryConvertToRef, isNullableObjectType, getParamSchema } from './lib';

describe('is', () => {
  test.each([
    [{}, false],
    [1, false],
    [undefined, false],
    [null, false],
    [schema.any(), false], // ignore any
    [schema.object({}, { defaultValue: {}, unknowns: 'allow' }), false], // ignore any
    [schema.never(), false],
    [schema.string(), true],
    [schema.number(), true],
    [schema.mapOf(schema.string(), schema.number()), true],
    [schema.recordOf(schema.string(), schema.number()), true],
    [schema.arrayOf(schema.string()), true],
    [schema.object({}), true],
    [schema.oneOf([schema.string(), schema.number()]), true],
    [schema.maybe(schema.literal('yes')), true],
  ])('"is" correctly identifies %#', (value, result) => {
    expect(is(value)).toBe(result);
  });
});

test('tryConvertToRef', () => {
  const schemaObject: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
    },
  };
  set(schemaObject, metaFields.META_FIELD_X_OAS_REF_ID, 'foo');
  expect(tryConvertToRef(schemaObject)).toEqual({
    idSchema: ['foo', { type: 'object', properties: { a: { type: 'string' } } }],
    ref: {
      $ref: '#/components/schemas/foo',
    },
  });

  const schemaObject2 = omit(schemaObject, metaFields.META_FIELD_X_OAS_REF_ID);
  expect(tryConvertToRef(schemaObject2)).toBeUndefined();
});

test('isNullableObjectType', () => {
  const any = schema.any({});
  expect(isNullableObjectType(any.getSchema().describe())).toBe(false);

  const nullableAny = schema.nullable(any);
  expect(isNullableObjectType(nullableAny.getSchema().describe())).toBe(false);

  const nullableObject = schema.nullable(schema.object({}));
  expect(isNullableObjectType(nullableObject.getSchema().describe())).toBe(true);
});

test('getParamSchema from {pathVar*}', () => {
  const a = { optional: true };
  const b = { optional: true };
  const c = { optional: true };
  const keyName = 'pathVar';
  // Special * syntax in API defs
  expect(getParamSchema({ a, b, [`${keyName}*`]: c }, keyName)).toBe(c);
  // Special * syntax with ? in API defs
  expect(getParamSchema({ a, b, [`${keyName}?*`]: c }, keyName)).toBe(c);
});
