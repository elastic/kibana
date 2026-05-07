/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metaFields, schema } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';
import { createCtx } from '../context';
import { joi2JsonInternal } from '../../parse';
import { processObject } from './object';

const { META_FIELD_X_OAS_OPTIONAL } = metaFields;

test.each([
  [schema.object({}), { type: 'object', properties: {}, additionalProperties: false }],
  [
    schema.object({ never: schema.never() }),
    { type: 'object', properties: {}, additionalProperties: false },
  ],
  [
    schema.object(
      {
        key1: schema.string(),
        key2: schema.number({ defaultValue: 42 }),
      },
      { defaultValue: { key1: 'value1', key2: 42 } }
    ),
    {
      type: 'object',
      default: { key1: 'value1', key2: 42 },
      properties: {
        key1: { type: 'string' },
        key2: { type: 'number', default: 42 },
      },
      additionalProperties: false,
      required: ['key1'],
    },
  ],
  [
    schema.object({ opt: schema.maybe(schema.string()) }),
    {
      type: 'object',
      properties: {
        opt: { type: 'string' },
      },
      additionalProperties: false,
    },
  ],
])('processObject %#', (input, result) => {
  const parsed = joi2JsonInternal(input.getInternalSchema());
  processObject(parsed);
  expect(parsed).toEqual(result);
});

test('processObject omits optional fields from required when property uses $ref to shared schema with x-oas-optional', () => {
  const ctx = createCtx();
  ctx.addSharedSchema('security_query_roles_sort', {
    type: 'object',
    properties: { field: { type: 'string' } },
    required: ['field'],
    [META_FIELD_X_OAS_OPTIONAL]: true,
  } as OpenAPIV3.SchemaObject);
  const parent: Record<string, unknown> = {
    type: 'object',
    properties: {
      sort: { $ref: '#/components/schemas/security_query_roles_sort' },
      name: { type: 'string' },
    },
    required: ['sort', 'name'],
    additionalProperties: false,
  };
  processObject(parent as Parameters<typeof processObject>[0], ctx);
  expect(parent.required).toEqual(['name']);
  expect(
    (ctx.getSharedSchemas().security_query_roles_sort as Record<string, unknown>)[
      META_FIELD_X_OAS_OPTIONAL
    ]
  ).toBeUndefined();
});
