/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZodError } from '@kbn/zod';
import type { VegaLibraryItemState } from '../schema';
import { transformVegaIn } from './transform_vega_in';
import { transformVegaOut } from './transform_vega_out';

const state: VegaLibraryItemState = {
  title: 'Vega chart',
  spec: { format: 'hjson', value: '{ mark: point }' },
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
    test('stores the API shape and extracts filter data view references', () => {
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
        ],
      });
    });

    test('does not add filters or references when filters are not provided', () => {
      const { filters, ...stateWithoutFilters } = state;
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

    test('throws when a filter data view reference is missing', () => {
      const { attributes } = transformVegaIn(state);
      expect(() => transformVegaOut(attributes, [])).toThrow(
        'Could not find reference for filters[0].data_view_id'
      );
    });

    test('returns attributes without filters unchanged', () => {
      const { filters, ...stateWithoutFilters } = state;
      expect(transformVegaOut(stateWithoutFilters, [])).toEqual(stateWithoutFilters);
    });

    test('throws when the stored spec does not satisfy the API schema', () => {
      const attributes = { title: 'Vega chart', spec: { format: 'hjson' as const, value: '' } };
      expect(() => transformVegaOut(attributes, [])).toThrow(ZodError);
    });

    test('throws when a stored filter does not satisfy the API schema', () => {
      const filterWithUnknownKey = {
        type: 'condition' as const,
        condition: { field: 'host', operator: 'exists' as const },
        unexpected: true,
      };
      const attributes = { title: 'Vega chart', spec: state.spec, filters: [filterWithUnknownKey] };
      expect(() => transformVegaOut(attributes, [])).toThrow(ZodError);
    });
  });
});
