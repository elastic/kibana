/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, metaFields } from '@kbn/config-schema';
import { joi2JsonInternal } from '../parse';
import { createCtx } from './context';

it('does not convert and record refs by default', () => {
  const ctx = createCtx();
  const obj = schema.object({}, { meta: { id: 'foo' } });
  const parsed = joi2JsonInternal(obj.getSchema());
  const result = ctx.processRef(parsed);
  expect(result).toMatchObject({ type: 'object', properties: {} });
  expect(ctx.sharedSchemas.get('foo')).toBeUndefined();
  expect(metaFields.META_FIELD_X_OAS_REF_ID in result).toBe(false);
});

it('can convert and record refs', () => {
  const ctx = createCtx({ refs: true });
  const obj = schema.object({}, { meta: { id: 'foo' } });
  const parsed = joi2JsonInternal(obj.getSchema());
  const result = ctx.processRef(parsed);
  expect(result).toEqual({ $ref: '#/components/schemas/foo' });
  expect(ctx.sharedSchemas.get('foo')).toMatchObject({ type: 'object', properties: {} });
  expect(metaFields.META_FIELD_X_OAS_REF_ID in ctx.sharedSchemas.get('foo')!).toBe(false);
});

it('can use provided shared schemas Map', () => {
  const myMap = new Map<string, any>();
  const ctx = createCtx({ refs: true, sharedSchemas: myMap });
  const obj = schema.object({}, { meta: { id: 'foo' } });
  const parsed = joi2JsonInternal(obj.getSchema());
  ctx.processRef(parsed);

  const obj2 = schema.object({}, { meta: { id: 'bar' } });
  const parsed2 = joi2JsonInternal(obj2.getSchema());
  ctx.processRef(parsed2);

  expect(myMap.get('foo')).toMatchObject({ type: 'object', properties: {} });
  expect(myMap.get('bar')).toMatchObject({ type: 'object', properties: {} });
});
