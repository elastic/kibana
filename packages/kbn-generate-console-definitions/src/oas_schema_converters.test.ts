/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasDocument } from './oas_schema_converters';
import {
  convertBodyRules,
  convertPathParameters,
  convertQueryParameters,
  resolveParameter,
} from './oas_schema_converters';

const doc: OasDocument = {
  components: {
    schemas: {
      Color: { type: 'string', enum: ['red', 'blue'] },
      Base: { type: 'object', properties: { name: { type: 'string' } } },
      Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } },
    },
    parameters: { Space: { name: 'spaceId', in: 'path', schema: { type: 'string' } } },
  },
};

describe('convertQueryParameters', () => {
  it('maps booleans, enums, arrays of enums and free text', () => {
    expect(
      convertQueryParameters(doc, [
        { name: 'flag', in: 'query', schema: { type: 'boolean' } },
        { name: 'purpose', in: 'query', schema: { type: 'string', enum: ['any', 'copy'] } },
        { name: 'color', in: 'query', schema: { $ref: '#/components/schemas/Color' } },
        {
          name: 'colors',
          in: 'query',
          schema: { type: 'array', items: { $ref: '#/components/schemas/Color' } },
        },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        {
          name: 'either',
          in: 'query',
          schema: { anyOf: [{ type: 'string', enum: ['a'] }, { type: 'number' }] },
        },
      ])
    ).toEqual({
      flag: '__flag__',
      purpose: ['any', 'copy'],
      color: ['red', 'blue'],
      colors: ['red', 'blue'],
      search: [],
      either: ['a'],
    });
  });
});

describe('convertPathParameters', () => {
  it('only keeps parameters with a fixed set of values', () => {
    expect(
      convertPathParameters(doc, [
        { name: 'id', in: 'path', schema: { type: 'string' } },
        { name: 'color', in: 'path', schema: { $ref: '#/components/schemas/Color' } },
      ])
    ).toEqual({ color: ['red', 'blue'] });
  });
});

describe('resolveParameter', () => {
  it('resolves component parameter references', () => {
    expect(resolveParameter(doc, { $ref: '#/components/parameters/Space' })?.name).toBe('spaceId');
    expect(resolveParameter(doc, { $ref: '#/components/parameters/Missing' })).toBeUndefined();
  });
});

describe('convertBodyRules', () => {
  it('maps primitives, booleans, enums and arrays', () => {
    expect(
      convertBodyRules(doc, {
        type: 'object',
        properties: {
          name: { type: 'string' },
          enabled: { type: 'boolean' },
          color: { $ref: '#/components/schemas/Color' },
          tags: { type: 'array', items: { type: 'string' } },
          items: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' } } },
          },
          meta: { type: 'object' },
        },
      })
    ).toEqual({
      name: '',
      enabled: { __one_of: [true, false] },
      color: { __one_of: ['red', 'blue'] },
      tags: [],
      items: [{ id: '' }],
      meta: {},
    });
  });

  it('keeps booleans of a oneOf as booleans', () => {
    expect(
      convertBodyRules(doc, {
        type: 'object',
        properties: {
          value: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
        },
      })
    ).toEqual({ value: { __one_of: [true, false] } });
  });

  it('merges allOf members and the union of oneOf alternatives', () => {
    expect(
      convertBodyRules(doc, {
        allOf: [
          { $ref: '#/components/schemas/Base' },
          {
            oneOf: [
              { type: 'object', properties: { a: { type: 'string' } } },
              { type: 'object', properties: { b: { type: 'string' } } },
            ],
          },
        ],
      })
    ).toEqual({ name: '', a: '', b: '' });
  });

  it('stops at recursive references and at the maximum depth', () => {
    expect(convertBodyRules(doc, { $ref: '#/components/schemas/Node' })).toEqual({ child: {} });
    expect(
      convertBodyRules(doc, {
        type: 'object',
        properties: {
          l1: {
            type: 'object',
            properties: {
              l2: {
                type: 'object',
                properties: {
                  l3: { type: 'object', properties: { l4: { type: 'string' } } },
                },
              },
            },
          },
        },
      })
    ).toEqual({ l1: { l2: { l3: {} } } });
  });

  it('returns undefined when the body has no known fields', () => {
    expect(convertBodyRules(doc, undefined)).toBeUndefined();
    expect(convertBodyRules(doc, { type: 'object' })).toBeUndefined();
    expect(convertBodyRules(doc, { type: 'array', items: { type: 'string' } })).toBeUndefined();
  });
});
