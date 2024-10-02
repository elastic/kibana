/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { convert, convertPathParameters, convertQuery } from './lib';

import { createLargeSchema } from './lib.test.util';

describe('zod', () => {
  describe('convert', () => {
    test('base case', () => {
      expect(convert(createLargeSchema())).toEqual({
        schema: {
          additionalProperties: false,
          properties: {
            any: {
              description: 'any type',
            },
            booleanDefault: {
              default: true,
              description: 'defaults to to true',
              type: 'boolean',
            },
            ipType: {
              format: 'ipv4',
              type: 'string',
            },
            literalType: {
              enum: ['literallythis'],
              type: 'string',
            },
            map: {
              items: {
                items: [
                  {
                    type: 'string',
                  },
                  {
                    type: 'string',
                  },
                ],
                maxItems: 2,
                minItems: 2,
                type: 'array',
              },
              maxItems: 125,
              type: 'array',
            },
            maybeNumber: {
              maximum: 1000,
              minimum: 1,
              type: 'number',
            },
            neverType: {
              not: {},
            },
            record: {
              additionalProperties: {
                type: 'string',
              },
              type: 'object',
            },
            string: {
              maxLength: 10,
              minLength: 1,
              type: 'string',
            },
            union: {
              anyOf: [
                {
                  description: 'Union string',
                  maxLength: 1,
                  type: 'string',
                },
                {
                  description: 'Union number',
                  minimum: 0,
                  type: 'number',
                },
              ],
            },
            uri: {
              default: 'prototest://something',
              format: 'uri',
              type: 'string',
            },
          },
          required: ['string', 'ipType', 'literalType', 'neverType', 'map', 'record', 'union'],
          type: 'object',
        },
        shared: {},
      });
    });
  });

  describe('convertPathParameters', () => {
    test('base conversion', () => {
      expect(
        convertPathParameters(z.object({ a: z.string() }), { a: { optional: false } })
      ).toEqual({
        params: [
          {
            in: 'path',
            name: 'a',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });
    test('throws if known parameters not found', () => {
      expect(() =>
        convertPathParameters(z.object({ b: z.string() }), { a: { optional: false } })
      ).toThrow(
        'Path expects key "a" from schema but it was not found. Existing schema keys are: b'
      );
    });
  });

  describe('convertQuery', () => {
    test('base conversion', () => {
      expect(convertQuery(z.object({ a: z.string() }))).toEqual({
        query: [
          {
            in: 'query',
            name: 'a',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });
  });
});
