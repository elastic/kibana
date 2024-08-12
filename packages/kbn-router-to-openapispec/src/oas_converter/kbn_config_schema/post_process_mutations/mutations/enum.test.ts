/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { processEnum } from './enum';

describe('processEnum', () => {
  it.each([
    {
      name: 'when there is no anyOf property does not change input',
      input: {} as OpenAPIV3.SchemaObject,
      expected: {},
    },
    {
      name: 'converts anyOf to enum if all items are enum and of the same type',
      input: {
        anyOf: [
          {
            type: 'string',
            enum: ['a', 'b'],
          },
          {
            type: 'string',
            enum: ['c', 'd'],
          },
          {
            type: 'string',
            enum: ['e'],
          },
        ],
        description: 'description',
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        enum: ['a', 'b', 'c', 'd', 'e'],
        description: 'description',
      },
    },
    {
      name: 'does not change input if item types are different',
      input: {
        anyOf: [
          {
            type: 'string',
            enum: ['a'],
          },
          {
            type: 'number',
            enum: [1],
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        anyOf: [
          {
            type: 'string',
            enum: ['a'],
          },
          {
            type: 'number',
            enum: [1],
          },
        ],
      },
    },
    {
      name: 'if anyOf contains a ref does not change input',
      input: {
        anyOf: [
          {
            $ref: '#/components/schemas/Ref',
          },
          {
            type: 'string',
            enum: ['a'],
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        anyOf: [
          {
            $ref: '#/components/schemas/Ref',
          },
          {
            type: 'string',
            enum: ['a'],
          },
        ],
      },
    },
    {
      name: 'if anyOf contains non-enums does not change input',
      input: {
        anyOf: [
          {
            type: 'object',
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        anyOf: [
          {
            type: 'object',
          },
        ],
      },
    },
  ])('$name', ({ input, expected }) => {
    processEnum(input);
    expect(input).toEqual(expected);
  });
});
