/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vegaLibraryItemSavedObjectSchema } from './vega_saved_object';

describe('Vega library item saved object schema', () => {
  test.each([
    { title: 'HJSON Vega', spec: { format: 'hjson', value: '{ mark: point }' } },
    { title: 'JSON Vega', spec: { format: 'json', value: { mark: 'point' } } },
    {
      title: 'Vega with filters and query',
      spec: { format: 'hjson', value: '{ mark: point }' },
      query: { expression: 'status:active', language: 'kql' },
      filters: [
        {
          type: 'condition',
          data_view_ref_name: 'filters[0].data_view_id',
          condition: { field: 'status', operator: 'is', value: 'active' },
        },
        { type: 'dsl', dsl: { match_all: {} } },
      ],
    },
  ])('accepts API-compatible attributes', (attributes) => {
    expect(vegaLibraryItemSavedObjectSchema.validate(attributes)).toEqual(attributes);
  });

  const spec = { format: 'hjson', value: '{ mark: point }' };
  test.each([
    ['empty title', { title: '', spec }],
    ['empty HJSON', { title: 'Empty HJSON', spec: { format: 'hjson', value: '' } }],
    ['unknown format', { title: 'Unknown format', spec: { format: 'yaml', value: 'mark: point' } }],
    [
      'unknown query language',
      { title: 'Unknown query', spec, query: { expression: 'a', language: 'sql' } },
    ],
    ['unknown filter type', { title: 'Unknown filter', spec, filters: [{ type: 'phrase' }] }],
    [
      'too many filters',
      {
        title: 'Too many filters',
        spec,
        filters: Array.from({ length: 101 }, () => ({ type: 'dsl', dsl: { match_all: {} } })),
      },
    ],
  ])('rejects %s', (_, attributes) => {
    expect(() => vegaLibraryItemSavedObjectSchema.validate(attributes)).toThrow();
  });

  test('normalizes a serialized JSON object before persistence', () => {
    expect(
      vegaLibraryItemSavedObjectSchema.validate({
        title: 'String JSON',
        spec: { format: 'json', value: '{ "mark": "point" }' },
      })
    ).toEqual({
      title: 'String JSON',
      spec: { format: 'json', value: { mark: 'point' } },
    });
  });
});
