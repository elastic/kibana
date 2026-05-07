/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { metaFields } from '@kbn/config-schema';
import { processAnyType, processMap, processRecord } from '.';
import { createCtx } from '../context';
import type { OpenAPIV3 } from 'openapi-types';

describe('processAnyType', () => {
  test('strips all keys from a plain any schema', () => {
    const obj: Record<string, unknown> = { type: 'any', 'x-oas-any-type': true };
    processAnyType(obj as any);
    expect(obj).toEqual({ nullable: true });
  });

  test('preserves description when present', () => {
    const obj: Record<string, unknown> = {
      type: 'any',
      'x-oas-any-type': true,
      description: 'accepts any value',
    };
    processAnyType(obj as any);
    expect(obj).toEqual({ description: 'accepts any value', nullable: true });
  });

  test('preserves nullable when present', () => {
    const obj: Record<string, unknown> = {
      type: 'any',
      'x-oas-any-type': true,
      nullable: true,
      description: 'nullable any',
    };
    processAnyType(obj as any);
    expect(obj).toEqual({ description: 'nullable any', nullable: true });
  });
});

test.each([
  [
    'processMap',
    processMap,
    schema.mapOf(
      schema.string(),
      schema.object({ a: schema.string() }, { meta: { id: 'myRef1' } })
    ),
    'myRef1',
  ],
  [
    'processRecord',
    processRecord,
    schema.recordOf(
      schema.string(),
      schema.object({ a: schema.string() }, { meta: { id: 'myRef2' } })
    ),
    'myRef2',
  ],
])('%p parses any additional properties specified', (_, processFn, obj, refId) => {
  const ctx = createCtx();
  const parsed = {
    type: 'object',
    [metaFields.META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]: () =>
      schema.object({ a: schema.string() }, { meta: { id: refId } }).getInternalSchema(),
  };

  processFn(ctx, parsed as OpenAPIV3.SchemaObject);

  expect(parsed).toEqual({
    type: 'object',
    additionalProperties: {
      $ref: `#/components/schemas/${refId}`,
    },
  });
  expect(ctx.getSharedSchemas()).toEqual({
    [refId]: {
      type: 'object',
      title: refId,
      additionalProperties: false,
      properties: {
        a: {
          type: 'string',
        },
      },
      required: ['a'],
    },
  });
});
