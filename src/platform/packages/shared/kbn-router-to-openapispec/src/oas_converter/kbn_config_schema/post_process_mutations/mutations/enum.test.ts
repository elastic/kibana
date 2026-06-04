/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    {
      name: 'collapses nullable anyOf for joi-to-json null branch shape (enum: [null])',
      input: {
        anyOf: [
          {
            type: 'string',
          },
          {
            enum: [null],
            nullable: true,
            anyOf: [],
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        nullable: true,
      },
    },
    {
      name: 'collapses nullable anyOf for internal placeholder null branch shape (enum: [])',
      input: {
        anyOf: [
          {
            type: 'string',
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        nullable: true,
      },
    },
    {
      name: 'preserves default null for joi-to-json null branch shape (enum: [null])',
      input: {
        default: null,
        anyOf: [
          {
            type: 'string',
          },
          {
            enum: [null],
            nullable: true,
            anyOf: [],
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        nullable: true,
        default: null,
      },
    },
    {
      name: 'preserves default null for internal placeholder null branch shape (enum: [])',
      input: {
        default: null,
        anyOf: [
          {
            type: 'string',
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        nullable: true,
        default: null,
      },
    },
    {
      name: 'correctly transforms schema.nullable inputs',
      input: {
        default: null,
        anyOf: [
          {
            description: 'test',
            type: 'object',
            properties: {
              test: {
                type: 'string',
              },
            },
            required: ['test'],
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        description: 'test',
        type: 'object',
        properties: {
          test: {
            type: 'string',
          },
        },
        required: ['test'],
        nullable: true,
        default: null,
      },
    },
    {
      name: 'preserves default null and strips inner default when collapsing nullable',
      input: {
        default: null,
        anyOf: [
          {
            type: 'string',
            default: 'ignored',
          },
          {
            enum: [null],
            nullable: true,
            anyOf: [],
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        nullable: true,
        default: null,
      },
    },
    {
      name: 'preserves nullable output when the non-null branch has no explicit type',
      input: {
        anyOf: [
          {
            oneOf: [
              {
                type: 'string',
              },
              {
                type: 'number',
              },
            ],
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'number',
          },
        ],
        nullable: true,
      },
    },
    {
      name: 'correctly transforms schema.nullable with $ref target using allOf wrapper',
      input: {
        anyOf: [
          {
            $ref: '#/components/schemas/MySchema',
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        allOf: [
          {
            $ref: '#/components/schemas/MySchema',
          },
        ],
        nullable: true,
      },
    },
    {
      name: 'replaces the internal nullable placeholder in larger unions',
      input: {
        anyOf: [
          {
            type: 'string',
          },
          {
            type: 'number',
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
          {
            type: 'boolean',
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        anyOf: [
          {
            type: 'string',
          },
          {
            type: 'number',
          },
          {
            type: 'boolean',
          },
        ],
        nullable: true,
      },
    },
    {
      name: 'collapses nullable anyOf for numeric enums',
      input: {
        anyOf: [
          {
            type: 'number',
            enum: [1, 2, 3],
          },
          {
            enum: [],
            nullable: true,
            type: undefined,
          },
        ],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'number',
        enum: [1, 2, 3, null],
        nullable: true,
      },
    },
  ])('$name', ({ input, expected }) => {
    processEnum(input);
    expect(input).toEqual(expected);
  });
});
