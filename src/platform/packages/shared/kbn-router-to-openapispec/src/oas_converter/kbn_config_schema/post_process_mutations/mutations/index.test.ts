/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { processAnyType, processMap, processRecord } from '.';
import { joi2JsonInternal } from '../../parse';
import { createCtx } from '../context';

describe('processAnyType', () => {
  test('strips all keys from a plain any schema', () => {
    const obj: Record<string, unknown> = { type: 'any', 'x-oas-any-type': true };
    processAnyType(obj as any);
    expect(obj).toEqual({});
  });

  test('preserves description when present', () => {
    const obj: Record<string, unknown> = {
      type: 'any',
      'x-oas-any-type': true,
      description: 'accepts any value',
    };
    processAnyType(obj as any);
    expect(obj).toEqual({ description: 'accepts any value' });
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
  const parsed = joi2JsonInternal(obj.getSchema());

  processFn(ctx, parsed);

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
