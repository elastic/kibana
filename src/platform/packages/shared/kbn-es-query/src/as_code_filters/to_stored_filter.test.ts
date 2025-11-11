/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeFilter, AsCodeConditionFilter } from '@kbn/es-query-server';
import type { StoredFilter } from './types';
import {
  toStoredFilter,
  convertFromSimpleCondition,
  convertFromFilterGroup,
  convertFromDSLFilter,
} from './to_stored_filter';
import { fromStoredFilter } from './from_stored_filter';
import { FilterStateStore } from '../..';
import { FilterConversionError } from './errors';
import { spatialFilterFixture } from '../__fixtures__/spatial_filter';

describe('toStoredFilter', () => {
  describe('main conversion function', () => {
    it('should convert condition filters to stored format', () => {
      const simplified: AsCodeFilter = {
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      };

      const result = toStoredFilter(simplified);

      expect(result.$state).toEqual({ store: 'appState' });
      expect(result.meta).toMatchObject({
        key: 'status',
        field: 'status',
        type: 'phrase',
        alias: null,
        disabled: false,
        negate: false,
      });
      expect(result.query).toEqual({
        match_phrase: {
          status: 'active',
        },
      });
    });

    it('should handle pinned filters', () => {
      const simplified: AsCodeFilter = {
        pinned: true,
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      };

      const result = toStoredFilter(simplified);

      expect(result.$state).toEqual({ store: 'globalState' });
    });

    it('should convert group filters to bool queries', () => {
      const simplified: AsCodeFilter = {
        group: {
          type: 'and',
          conditions: [
            { field: 'status', operator: 'is', value: 'active' },
            { field: 'type', operator: 'is', value: 'user' },
          ],
        },
      };

      const result = toStoredFilter(simplified);

      // AND groups use combined filter format
      expect(result.meta.type).toBe('combined');
      expect(result.meta.relation).toBe('and');
      expect(Array.isArray(result.meta.params)).toBe(true);
    });

    it('should convert DSL filters', () => {
      const simplified: AsCodeFilter = {
        dsl: {
          query: { script: { source: 'doc.field.value > 0' } },
        },
      };

      const result = toStoredFilter(simplified);

      expect(result.query).toEqual({
        script: { source: 'doc.field.value > 0' },
      });
      expect(result.meta.type).toBe('custom');
    });

    it('should throw for filters with no type', () => {
      const simplified = {} as AsCodeFilter;

      expect(() => toStoredFilter(simplified)).toThrow(FilterConversionError);
    });
  });

  describe('convertFromSimpleCondition', () => {
    const createBaseStored = (): StoredFilter => ({
      $state: { store: FilterStateStore.APP_STATE },
      meta: { alias: null, disabled: false, negate: false },
      query: {}, // Will be overridden by the conversion function
    });

    it('should convert exists conditions', () => {
      const condition: AsCodeConditionFilter['condition'] = {
        field: 'username',
        operator: 'exists',
      };

      const result = convertFromSimpleCondition(condition, createBaseStored());

      expect(result.query).toEqual({ exists: { field: 'username' } });
      expect(result.meta.type).toBe('exists');
    });

    it('should convert not_exists conditions', () => {
      const condition: AsCodeConditionFilter['condition'] = {
        field: 'username',
        operator: 'not_exists',
      };

      const result = convertFromSimpleCondition(condition, createBaseStored());

      expect(result.query).toEqual({ exists: { field: 'username' } });
      expect(result.meta.negate).toBe(true);
    });

    it('should convert is conditions', () => {
      const condition: AsCodeConditionFilter['condition'] = {
        field: 'status',
        operator: 'is',
        value: 'active',
      };

      const result = convertFromSimpleCondition(condition, createBaseStored());

      expect(result.query).toEqual({
        match_phrase: {
          status: 'active',
        },
      });
      expect(result.meta.type).toBe('phrase');
    });

    it('should convert range conditions', () => {
      const condition: AsCodeConditionFilter['condition'] = {
        field: 'age',
        operator: 'range',
        value: { gte: 18, lte: 65 },
      };

      const result = convertFromSimpleCondition(condition, createBaseStored());

      expect(result.query).toEqual({ range: { age: { gte: 18, lte: 65 } } });
      expect(result.meta.params).toEqual({ gte: 18, lte: 65 });
    });
  });

  describe('convertFromFilterGroup', () => {
    const createBaseStored = (): StoredFilter => ({
      $state: { store: FilterStateStore.APP_STATE },
      meta: { alias: null, disabled: false, negate: false },
      query: {},
    });

    it('should convert AND groups to must queries', () => {
      const group = {
        type: 'and' as const,
        conditions: [
          {
            field: 'status',
            operator: 'is',
            value: 'active',
          } as AsCodeConditionFilter['condition'],
          { field: 'type', operator: 'is', value: 'user' } as AsCodeConditionFilter['condition'],
        ],
      };

      const result = convertFromFilterGroup(group, createBaseStored());

      // AND groups use combined filter format with meta.params
      expect(result.meta.type).toBe('combined');
      expect(result.meta.relation).toBe('and');
      expect(Array.isArray(result.meta.params)).toBe(true);
      expect(result.meta.params).toHaveLength(2);

      // Verify the params contain the converted filters
      const params = result.meta.params as unknown as any[];
      expect(params[0].query).toEqual({ match_phrase: { status: 'active' } });
      expect(params[1].query).toEqual({ match_phrase: { type: 'user' } });
    });

    it('should convert OR groups to should queries', () => {
      const group = {
        type: 'or' as const,
        conditions: [
          {
            field: 'status',
            operator: 'is',
            value: 'active',
          } as AsCodeConditionFilter['condition'],
          {
            field: 'status',
            operator: 'is',
            value: 'pending',
          } as AsCodeConditionFilter['condition'],
        ],
      };

      const result = convertFromFilterGroup(group, createBaseStored());

      // Same-field OR groups should be detected as phrases filter with match_phrase queries
      expect(result.query).toEqual({
        bool: {
          should: [{ match_phrase: { status: 'active' } }, { match_phrase: { status: 'pending' } }],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('convertFromDSLFilter', () => {
    const createBaseStored = (): StoredFilter => ({
      $state: { store: FilterStateStore.APP_STATE },
      meta: { alias: null, disabled: false, negate: false },
      query: {},
    });

    it('should convert DSL filters to stored format', () => {
      const dsl = {
        query: { script: { source: 'doc.field.value > 0' } },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('custom');
    });

    it('should detect match_all filter type', () => {
      const dsl = {
        query: { match_all: {} },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('match_all');
      expect(result.meta.params).toEqual({});
    });

    it('should detect query_string filter type', () => {
      const dsl = {
        query: {
          query_string: {
            query: 'status:active AND type:user',
          },
        },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('query_string');
      expect(result.meta.params).toEqual({
        query: 'status:active AND type:user',
      });
    });

    it('should detect spatial_filter type from geo_shape query', () => {
      const dsl = {
        query: {
          bool: {
            should: [
              {
                geo_shape: {
                  location: {
                    shape: {
                      type: 'envelope',
                      coordinates: [
                        [-74.1, 40.73],
                        [-73.9, 40.71],
                      ],
                    },
                    relation: 'intersects',
                  },
                },
              },
            ],
          },
        },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('spatial_filter');
    });

    it('should detect spatial_filter type from geo_bounding_box query', () => {
      const dsl = {
        query: {
          bool: {
            filter: [
              {
                geo_bounding_box: {
                  location: {
                    top_left: { lat: 40.73, lon: -74.1 },
                    bottom_right: { lat: 40.71, lon: -73.9 },
                  },
                },
              },
            ],
          },
        },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('spatial_filter');
    });

    it('should detect spatial_filter type from geo_distance query', () => {
      const dsl = {
        query: {
          bool: {
            must: [
              {
                geo_distance: {
                  distance: '200km',
                  location: { lat: 40.73, lon: -74.0 },
                },
              },
            ],
          },
        },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('spatial_filter');
    });

    it('should detect range_from_value type for single-bound ranges', () => {
      const dsl = {
        query: {
          range: {
            age: {
              gte: 18,
            },
          },
        },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('range_from_value');
      expect(result.meta.params).toEqual({ gte: 18 });
    });

    it('should detect regular range type for multi-bound ranges', () => {
      const dsl = {
        query: {
          range: {
            age: {
              gte: 18,
              lte: 65,
            },
          },
        },
      };

      const result = convertFromDSLFilter(dsl, createBaseStored());

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('range');
      expect(result.meta.params).toEqual({ gte: 18, lte: 65 });
    });

    it('should use preserved filterType over detection', () => {
      const dsl = {
        query: { match_all: {} },
      };

      // Base stored already has a type from preservation
      const baseWithType: StoredFilter = {
        ...createBaseStored(),
        meta: {
          ...createBaseStored().meta,
          type: 'spatial_filter',
        },
      };

      const result = convertFromDSLFilter(dsl, baseWithType);

      // Should preserve the original type, not detect match_all
      expect(result.meta.type).toBe('spatial_filter');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve spatial filter data through round-trip conversion', () => {
      const originalFilter = spatialFilterFixture as StoredFilter;

      // Convert to SimpleFilter
      const simpleFilter = fromStoredFilter(originalFilter);

      // Convert back to StoredFilter
      const roundTripFilter = toStoredFilter(simpleFilter);

      // Verify core query is preserved
      expect(roundTripFilter.query).toEqual(originalFilter.query);

      // Verify base properties are preserved
      expect(roundTripFilter.meta.alias).toBe(originalFilter.meta.alias);
      expect(roundTripFilter.meta.disabled).toBe(originalFilter.meta.disabled);
      expect(roundTripFilter.meta.negate).toBe(originalFilter.meta.negate);
      expect(roundTripFilter.$state).toEqual(originalFilter.$state);

      // Verify filterType is preserved (now supported!)
      expect(roundTripFilter.meta.type).toBe(originalFilter.meta.type);

      // Verify isMultiIndex is preserved (now supported!)
      expect(roundTripFilter.meta.isMultiIndex).toBe(originalFilter.meta.isMultiIndex);
    });
  });
});
