/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { joi2JsonInternal } from '../parse';
import { createCtx } from './context';

it('records schemas as expected', () => {
  const ctx = createCtx();
  const objA = schema.object({});
  const objB = schema.object({});
  const a = joi2JsonInternal(objA.getSchema());
  const b = joi2JsonInternal(objB.getSchema());

  ctx.addSharedSchema('a', a);
  ctx.addSharedSchema('b', b);

  expect(ctx.getSharedSchemas()).toMatchObject({
    a: { properties: {} },
    b: { properties: {} },
  });
});
