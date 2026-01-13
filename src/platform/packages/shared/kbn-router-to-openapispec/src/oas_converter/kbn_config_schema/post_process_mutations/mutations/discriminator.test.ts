/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { joi2JsonInternal } from '../../parse';
import { processDiscriminator } from './discriminator';
import { createCtx } from '../context';

test.each([
  [
    schema.discriminatedUnion('type', [
      schema.object({ type: schema.literal('str'), value: schema.string() }),
      schema.object({ type: schema.literal('num'), value: schema.number() }),
    ]),
    {
      oneOf: [
        {
          $ref: '#/components/schemas/get-test-0',
        },
        {
          $ref: '#/components/schemas/get-test-1',
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
    },
  ],
])('processDiscriminator %#', (input, result) => {
  const parsed = joi2JsonInternal(input.getSchema());
  const ctx = createCtx({ namespace: 'get-test' });
  processDiscriminator(ctx, parsed);
  expect(ctx.getSharedSchemas()).toMatchObject({
    'get-test-0': {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['str'] },
      },
    },
    'get-test-1': {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['num'] },
      },
    },
  });
  expect(parsed).toEqual(result);
});
