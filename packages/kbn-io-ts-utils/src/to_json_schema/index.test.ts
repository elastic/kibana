/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { toJsonSchema } from '.';

describe('toJsonSchema', () => {
  it('converts simple types to JSON schema', () => {
    expect(
      toJsonSchema(
        t.type({
          foo: t.string,
        })
      )
    ).toEqual({
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
      },
      required: ['foo'],
    });

    expect(
      toJsonSchema(
        t.type({
          foo: t.union([t.boolean, t.string]),
        })
      )
    ).toEqual({
      type: 'object',
      properties: {
        foo: {
          anyOf: [{ type: 'boolean' }, { type: 'string' }],
        },
      },
      required: ['foo'],
    });
  });

  it('converts record/dictionary types', () => {
    expect(
      toJsonSchema(
        t.record(
          t.string,
          t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.array(t.boolean) })])
        )
      )
    ).toEqual({
      type: 'object',
      additionalProperties: {
        allOf: [
          { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
          { type: 'object', properties: { bar: { type: 'array', items: { type: 'boolean' } } } },
        ],
      },
    });
  });
});
