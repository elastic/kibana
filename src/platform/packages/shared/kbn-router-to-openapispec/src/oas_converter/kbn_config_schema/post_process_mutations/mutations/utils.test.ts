/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { ensureNullableEnumIncludesNull, stripBadDefault } from './utils';

test.each([
  [{}, {}],
  [{ type: 'object' }, { type: 'object' }],
  [{ type: 'object', default: { special: 'deep' } }, { type: 'object' }],
  [
    { type: 'object', default: { special: 'deep', another: 1 } },
    { type: 'object', default: { another: 1 } },
  ],
  [
    { type: 'object', default: () => ({ special: 'deep', another: 1 }) }, // will not strip "special: 'deep'" in this case
    { type: 'object', default: { another: 1, special: 'deep' } },
  ],
])('stripBadDefault %#', (input, output) => {
  stripBadDefault(input as any);
  expect(input).toEqual(output);
});

describe('ensureNullableEnumIncludesNull', () => {
  it.each([
    {
      name: 'adds null to nullable enums missing it',
      input: {
        type: 'integer',
        enum: [1, 2, 3],
        nullable: true,
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'integer',
        enum: [1, 2, 3, null],
        nullable: true,
      },
    },
    {
      name: 'does not duplicate null when already present',
      input: {
        type: 'string',
        enum: ['a', null],
        nullable: true,
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        enum: ['a', null],
        nullable: true,
      },
    },
    {
      name: 'does not change non-nullable enums',
      input: {
        type: 'integer',
        enum: [1, 2, 3],
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'integer',
        enum: [1, 2, 3],
      },
    },
    {
      name: 'does not change nullable schemas without enum',
      input: {
        type: 'string',
        nullable: true,
      } as OpenAPIV3.SchemaObject,
      expected: {
        type: 'string',
        nullable: true,
      },
    },
  ])('$name', ({ input, expected }) => {
    ensureNullableEnumIncludesNull(input);
    expect(input).toEqual(expected);
  });
});
