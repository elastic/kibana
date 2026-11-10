/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VegaLibraryItemState } from '../schema';
import { transformVegaIn } from './transform_vega_in';
import { transformVegaOut } from './transform_vega_out';

const state: VegaLibraryItemState = {
  title: 'Vega chart',
  spec: { format: 'hjson', value: '{ mark: point }' },
  tags: ['tag-1', 'tag-2'],
  query: { expression: 'message:error', language: 'lucene' },
  filters: [
    {
      type: 'condition',
      data_view_id: 'logs-data-view',
      condition: { field: 'status', operator: 'is', value: 'active' },
    },
    { type: 'dsl', dsl: { match_all: {} } },
  ],
};

describe('Vega library item transforms', () => {
  describe('transformVegaIn', () => {
    test('stores the API shape and extracts filter data view and tag references', () => {
      expect(transformVegaIn(state)).toEqual({
        attributes: {
          title: 'Vega chart',
          spec: state.spec,
          query: state.query,
          filters: [
            {
              type: 'condition',
              data_view_ref_name: 'filters[0].data_view_id',
              condition: { field: 'status', operator: 'is', value: 'active' },
            },
            { type: 'dsl', dsl: { match_all: {} } },
          ],
        },
        references: [
          { name: 'filters[0].data_view_id', type: 'index-pattern', id: 'logs-data-view' },
          { name: 'tag-ref-tag-1', type: 'tag', id: 'tag-1' },
          { name: 'tag-ref-tag-2', type: 'tag', id: 'tag-2' },
        ],
      });
    });

    test('does not add filters or references when filters and tags are not provided', () => {
      const { filters, tags, ...stateWithoutFilters } = state;
      expect(transformVegaIn(stateWithoutFilters)).toEqual({
        attributes: stateWithoutFilters,
        references: [],
      });
    });
  });

  describe('transformVegaOut', () => {
    test('round-trips API state', () => {
      const { attributes, references } = transformVegaIn(state);
      expect(transformVegaOut(attributes, references)).toEqual(state);
    });

    test('returns attributes without filters unchanged and defaults tags to an empty array', () => {
      const { filters, tags, ...stateWithoutFilters } = state;
      expect(transformVegaOut(stateWithoutFilters, [])).toEqual({
        ...stateWithoutFilters,
        tags: [],
      });
    });

    test('throws when a filter data view reference is missing', () => {
      const { attributes } = transformVegaIn(state);
      expect(() => transformVegaOut(attributes, [])).toThrow('Could not find reference');
    });
  });
});
