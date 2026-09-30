/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { StoredVegaLibraryItemState } from '../../vega_saved_object';
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
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      expect(transformVegaOut(attributes, references, logger)).toEqual(state);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('drops filters with missing references and keeps the others', () => {
      const { attributes } = transformVegaIn(state);
      expect(transformVegaOut(attributes, [], logger).filters).toEqual([
        { type: 'dsl', dsl: { match_all: {} } },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not find reference for filters[0].data_view_id')
      );
    });

    test('drops filters that do not satisfy the API schema', () => {
      const attributes = {
        ...transformVegaIn(state).attributes,
        filters: [
          { type: 'condition', condition: { field: 'status', operator: 'unknown' } },
          { type: 'dsl', dsl: { match_all: {} } },
        ],
      } as StoredVegaLibraryItemState;

      expect(transformVegaOut(attributes, [], logger).filters).toEqual([
        { type: 'dsl', dsl: { match_all: {} } },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Dropped Vega library item filter [filters.0]')
      );
    });

    test('returns attributes without filters unchanged', () => {
      const { filters, ...stateWithoutFilters } = state;
      expect(transformVegaOut(stateWithoutFilters, [], logger)).toEqual(stateWithoutFilters);
    });
  });
});
