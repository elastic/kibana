/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { joi2JsonInternal } from '../../parse';
import { createCtx } from '../context';
import { processRef } from './ref';

test('create a new ref entry', () => {
  const ctx = createCtx({ refs: true });
  const obj = schema.object({ a: schema.string() }, { meta: { id: 'id' } });
  const parsed = joi2JsonInternal(obj.getSchema());
  const result = processRef(ctx, parsed);
  expect(result).toEqual({
    $ref: '#/components/schemas/id',
  });
  expect(ctx.sharedSchemas.get('id')).toMatchObject({
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
    },
  });
});
