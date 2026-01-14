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
    'test-simple',
    {
      oneOf: [
        {
          $ref: '#/components/schemas/test-simple-1',
        },
        {
          $ref: '#/components/schemas/test-simple-2',
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
    },
    {
      'test-simple-1': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['str'] },
        },
      },
      'test-simple-2': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['num'] },
        },
      },
    },
  ],
  [
    schema.discriminatedUnion('type', [
      schema.object({ type: schema.literal('str'), value: schema.string() }),
      schema.object({ type: schema.literal('num'), value: schema.number() }),
      schema.object({ type: schema.string(), value: schema.number() }),
    ]),
    'test-catch-all',
    {
      oneOf: [
        {
          $ref: '#/components/schemas/test-catch-all-1',
        },
        {
          $ref: '#/components/schemas/test-catch-all-2',
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
    },
    {
      'test-catch-all-1': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['str'] },
        },
      },
      'test-catch-all-2': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['num'] },
        },
      },
    },
  ],
])('processDiscriminator %#', (input, namespace, resultSchema, resultSharedSchemas) => {
  const parsed = joi2JsonInternal(input.getSchema());
  const ctx = createCtx({ namespace });
  processDiscriminator(ctx, parsed);
  expect(parsed).toEqual(resultSchema);
  expect(ctx.getSharedSchemas()).toMatchObject(resultSharedSchemas);
});
