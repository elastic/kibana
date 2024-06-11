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
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
          bar: {
            type: 'array',
            items: {
              type: 'boolean',
            },
          },
        },
        required: ['foo'],
      },
    });
  });

  it('converts literal types', () => {
    expect(
      toJsonSchema(
        t.type({
          myEnum: t.union([t.literal(true), t.literal(0), t.literal('foo')]),
        })
      )
    ).toEqual({
      type: 'object',
      properties: {
        myEnum: {
          anyOf: [
            {
              type: 'boolean',
              const: true,
            },
            {
              type: 'number',
              const: 0,
            },
            {
              type: 'string',
              const: 'foo',
            },
          ],
        },
      },
      required: ['myEnum'],
    });
  });

  it('merges schemas where possible', () => {
    expect(
      toJsonSchema(
        t.intersection([
          t.type({
            myEnum: t.union([t.literal('foo'), t.literal('bar')]),
          }),
          t.type({
            requiredProperty: t.string,
            anotherRequiredProperty: t.string,
          }),
          t.partial({
            optionalProperty: t.string,
          }),
          t.type({
            mixedProperty: t.string,
          }),
          t.type({
            mixedProperty: t.number,
          }),
        ])
      )
    ).toEqual({
      type: 'object',
      properties: {
        myEnum: {
          type: 'string',
          enum: ['foo', 'bar'],
        },
        optionalProperty: {
          type: 'string',
        },
        requiredProperty: {
          type: 'string',
        },
        anotherRequiredProperty: {
          type: 'string',
        },
        mixedProperty: {
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
          ],
        },
      },
      required: ['myEnum', 'requiredProperty', 'anotherRequiredProperty', 'mixedProperty'],
    });
  });
});
