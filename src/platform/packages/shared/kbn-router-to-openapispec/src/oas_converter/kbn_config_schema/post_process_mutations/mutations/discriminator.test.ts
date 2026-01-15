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
import { cloneDeep } from 'lodash';

test.each([
  [
    schema.discriminatedUnion('type', [
      schema.object(
        { type: schema.literal('str'), value: schema.string() },
        { meta: { id: 'my-str-my-team' } }
      ),
      schema.object(
        { type: schema.literal('num'), value: schema.number() },
        { meta: { id: 'my-num-team' } }
      ),
    ]),
    'test-simple',
    {
      oneOf: [
        {
          $ref: '#/components/schemas/my-str-my-team',
        },
        {
          $ref: '#/components/schemas/my-num-team',
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
    },
    {
      'my-str-my-team': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['str'] },
        },
      },
      'my-num-team': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['num'] },
        },
      },
    },
  ],
  [
    schema.discriminatedUnion('type', [
      schema.object(
        { type: schema.literal('str'), value: schema.string() },
        { meta: { id: 'my-str-my-team' } }
      ),
      schema.object(
        { type: schema.literal('num'), value: schema.number() },
        { meta: { id: 'my-num-team' } }
      ),
      schema.object(
        { type: schema.string(), value: schema.number() },
        { meta: { id: 'my-catch-all-my-team' } }
      ),
    ]),
    'test-catch-all',
    {
      oneOf: [
        {
          $ref: '#/components/schemas/my-str-my-team',
        },
        {
          $ref: '#/components/schemas/my-num-team',
        },
      ],
      discriminator: {
        propertyName: 'type',
      },
      description: 'The catch all schema for this discriminator is my-catch-all-my-team',
    },
    {
      'my-str-my-team': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['str'] },
        },
      },
      'my-num-team': {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['num'] },
        },
      },
    },
  ],
])('processDiscriminator %#', (input, namespace, resultSchema, resultSharedSchemas) => {
  const parsed = joi2JsonInternal(input.getSchema());
  const ctx = createCtx({ sharedSchemas: new Map(Object.entries(parsed.schemas)) });
  delete parsed.schemas;
  processDiscriminator(ctx, parsed);
  expect(parsed).toEqual(resultSchema);
  expect(ctx.getSharedSchemas()).toMatchObject(resultSharedSchemas);
});

describe('throws if any schema has no ID', () => {
  it('first schema has no ID', () => {
    const parsed = joi2JsonInternal(
      schema
        .discriminatedUnion('type', [
          schema.object({ type: schema.literal('num'), value: schema.number() }),
          schema.object(
            { type: schema.literal('str'), value: schema.string() },
            { meta: { id: 'my-str-my-team' } }
          ),
        ])
        .getSchema()
    );
    const ctx = createCtx({ sharedSchemas: new Map(Object.entries(parsed.schemas)) });
    expect(() => processDiscriminator(ctx, parsed)).toThrow(
      'When using schema.discriminator ensure that every entry schema has an ID.'
    );
  });
  it('other schema has no ID', () => {
    const parsed = joi2JsonInternal(
      schema
        .discriminatedUnion('type', [
          schema.object(
            { type: schema.literal('str'), value: schema.string() },
            { meta: { id: 'my-str-my-team' } }
          ),
          schema.object({ type: schema.literal('num'), value: schema.number() }),
        ])
        .getSchema()
    );
    const ctx = createCtx({ sharedSchemas: new Map(Object.entries(parsed.schemas)) });
    expect(() => processDiscriminator(ctx, parsed)).toThrow(
      'When using schema.discriminator ensure that every entry schema has an ID.'
    );
  });
});

it.each([
  schema.oneOf([
    schema.object({ type: schema.literal('str'), value: schema.string() }),
    schema.object({ type: schema.literal('num'), value: schema.number() }),
  ]),
  schema.union([
    schema.object({ type: schema.literal('str'), value: schema.string() }),
    schema.object({ type: schema.literal('num'), value: schema.number() }),
  ]),
])('does not alter other union types %#', (inputSchema) => {
  const ctx = createCtx();
  const parsed = joi2JsonInternal(inputSchema.getSchema());
  const parsedCopy = cloneDeep(parsed);
  processDiscriminator(ctx, parsedCopy);
  expect(parsedCopy).toEqual(parsed);
});
