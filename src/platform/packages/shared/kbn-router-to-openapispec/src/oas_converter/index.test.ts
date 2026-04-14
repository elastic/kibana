/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OasConverter } from '.';
import { schema } from '@kbn/config-schema';

describe('OasConverter', () => {
  it('converts schemas with refs', () => {
    const converter = new OasConverter();
    const obj = schema.object({ foo: schema.string() }, { meta: { id: 'test' } });
    const obj2 = schema.object({ bar: schema.string(), fooObject: obj });
    const oasSchema = converter.convert(obj2);
    expect(oasSchema).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        bar: {
          type: 'string',
        },
        fooObject: {
          $ref: '#/components/schemas/test',
        },
      },
      required: ['bar', 'fooObject'],
    });

    expect(converter.getSchemaComponents()).toEqual({
      schemas: {
        test: {
          type: 'object',
          title: 'test',
          additionalProperties: false,
          properties: {
            foo: {
              type: 'string',
            },
          },
          required: ['foo'],
        },
      },
    });
  });

  it('maps field availability metadata to x-state', () => {
    const converter = new OasConverter();
    const obj = schema.object({
      foo: schema.string({
        meta: { availability: { stability: 'stable', since: '9.4.0' } },
      }),
    });

    expect(converter.convert(obj)).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        foo: {
          type: 'string',
          'x-state': 'Generally available; added in 9.4.0',
        },
      },
      required: ['foo'],
    });
  });

  it('omits field since metadata from x-state in serverless mode', () => {
    const converter = new OasConverter({ serverless: true });
    const obj = schema.object({
      foo: schema.string({
        meta: { availability: { stability: 'stable', since: '9.4.0' } },
      }),
    });

    expect(converter.convert(obj)).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        foo: {
          type: 'string',
          'x-state': 'Generally available',
        },
      },
      required: ['foo'],
    });
  });
});
