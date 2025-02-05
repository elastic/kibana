/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import { getFieldListFromTypeMapping } from './get_field_list';

describe('getFieldListFromTypeMapping', () => {
  it('returns an empty list for empty mappings', () => {
    const mappings: SavedObjectsTypeMappingDefinition = {
      properties: {},
    };
    expect(getFieldListFromTypeMapping(mappings)).toEqual([]);
  });

  it('returns the correct list for top level fields', () => {
    const mappings: SavedObjectsTypeMappingDefinition = {
      properties: {
        foo: { type: 'text' },
        bar: { type: 'text' },
      },
    };
    expect(getFieldListFromTypeMapping(mappings)).toEqual(['bar', 'foo']);
  });

  it('returns the correct list for deep fields', () => {
    const mappings: SavedObjectsTypeMappingDefinition = {
      properties: {
        foo: {
          properties: {
            hello: { type: 'text' },
            dolly: { type: 'text' },
          },
        },
        bar: { type: 'text' },
      },
    };
    expect(getFieldListFromTypeMapping(mappings)).toEqual(['bar', 'foo', 'foo.dolly', 'foo.hello']);
  });

  it('returns the correct list for any depth', () => {
    const mappings: SavedObjectsTypeMappingDefinition = {
      properties: {
        foo: {
          properties: {
            hello: { type: 'text' },
            dolly: {
              properties: {
                far: { type: 'text' },
              },
            },
          },
        },
        bar: { type: 'text' },
      },
    };
    expect(getFieldListFromTypeMapping(mappings)).toEqual([
      'bar',
      'foo',
      'foo.dolly',
      'foo.dolly.far',
      'foo.hello',
    ]);
  });
});
