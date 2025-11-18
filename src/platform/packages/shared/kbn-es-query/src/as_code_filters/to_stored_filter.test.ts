/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeFilter, AsCodeConditionFilter, AsCodeDSLFilter } from '@kbn/es-query-server';
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
      expect(result.meta.relation).toBe('AND');
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
      expect(result.meta.relation).toBe('AND');
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
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
          query: { script: { source: 'doc.field.value > 0' } },
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('custom');
    });

    it('should detect match_all filter type', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
          query: { match_all: {} },
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('match_all');
      expect(result.meta.params).toEqual({});
    });

    it('should detect query_string filter type', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
          query: {
            query_string: {
              query: 'status:active AND type:user',
            },
          },
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('query_string');
      expect(result.meta.params).toEqual({
        query: 'status:active AND type:user',
      });
    });

    it('should detect spatial_filter type from geo_shape query', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
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
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('spatial_filter');
    });

    it('should detect spatial_filter type from geo_bounding_box query', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
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
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('spatial_filter');
    });

    it('should detect spatial_filter type from geo_distance query', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
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
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('spatial_filter');
    });

    it('should detect range_from_value type for single-bound ranges', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
          query: {
            range: {
              age: {
                gte: 18,
              },
            },
          },
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('range_from_value');
      expect(result.meta.params).toEqual({ gte: 18 });
    });

    it('should detect regular range type for multi-bound ranges', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
          query: {
            range: {
              age: {
                gte: 18,
                lte: 65,
              },
            },
          },
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, createBaseStored());

      expect(result.query).toEqual(asCodeFilter.dsl.query);
      expect(result.meta.type).toBe('range');
      expect(result.meta.params).toEqual({ gte: 18, lte: 65 });
    });

    it('should use preserved filterType over detection', () => {
      const asCodeFilter: AsCodeDSLFilter = {
        dsl: {
          query: { match_all: {} },
        },
      };

      // Base stored already has a type from preservation
      const baseWithType: StoredFilter = {
        ...createBaseStored(),
        meta: {
          ...createBaseStored().meta,
          type: 'spatial_filter',
        },
      };

      const result = convertFromDSLFilter(asCodeFilter, baseWithType);

      // Should preserve the original type, not detect match_all
      expect(result.meta.type).toBe('spatial_filter');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve simple condition filter data through round-trip conversion', () => {
      const originalFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: 'kibana-green',
          key: 'tags.keyword',
          field: 'tags.keyword',
          params: ['error', 'info', 'warning'],
          type: 'phrases',
          index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'tags.keyword': 'error',
                },
              },
              {
                match_phrase: {
                  'tags.keyword': 'info',
                },
              },
              {
                match_phrase: {
                  'tags.keyword': 'warning',
                },
              },
            ],
          },
        },
        $state: {
          store: 'appState',
        },
      } as StoredFilter;

      const asCodeFilter = fromStoredFilter(originalFilter);
      const roundTripFilter = toStoredFilter(asCodeFilter);
      expect(roundTripFilter).toEqual(originalFilter);
    });

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

  describe('Scripted Filters', () => {
    it('should handle scripted phrase filters', () => {
      const scriptedPhraseFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          field: 'calculated_field',
          type: 'phrase',
          negate: false,
          disabled: false,
          alias: 'Scripted calculation equals 100',
          params: { value: 100 },
        },
        query: {
          script: {
            script: {
              source: "doc['field1'].value + doc['field2'].value == params.value",
              params: { value: 100 },
              lang: 'painless',
            },
          },
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(scriptedPhraseFilter);

      // Should be converted to DSL format (scripted filters are complex)
      expect('dsl' in asCodeFilter).toBe(true);
      if ('dsl' in asCodeFilter) {
        expect(asCodeFilter.dsl.query).toEqual(scriptedPhraseFilter.query);
      }
      expect(asCodeFilter.label).toBe('Scripted calculation equals 100');
      expect(asCodeFilter.filterType).toBe('phrase');

      // Convert back to StoredFilter
      const roundTrip = toStoredFilter(asCodeFilter);

      // Verify script is preserved
      expect(roundTrip.query).toEqual(scriptedPhraseFilter.query);
      expect(roundTrip.meta.type).toBe('phrase');
      // Verify meta.field and meta.params are preserved through round-trip
      expect(roundTrip.meta.field).toBe('calculated_field');
      expect(roundTrip.meta.params).toEqual({ value: 100 });
    });

    it('should handle scripted range filters', () => {
      const scriptedRangeFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          field: 'calculated_field',
          type: 'range',
          negate: false,
          disabled: false,
          alias: 'Scripted calculation between 0 and 100',
          params: { gte: 0, lt: 100 },
        },
        query: {
          script: {
            script: {
              source:
                "(doc['field1'].value + doc['field2'].value) >= params.gte && (doc['field1'].value + doc['field2'].value) < params.lt",
              params: { gte: 0, lt: 100 },
              lang: 'painless',
            },
          },
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(scriptedRangeFilter);

      // Should be converted to DSL format
      expect('dsl' in asCodeFilter).toBe(true);
      if ('dsl' in asCodeFilter) {
        expect(asCodeFilter.dsl.query).toEqual(scriptedRangeFilter.query);
      }
      expect(asCodeFilter.label).toBe('Scripted calculation between 0 and 100');
      expect(asCodeFilter.filterType).toBe('range');

      // Convert back to StoredFilter
      const roundTrip = toStoredFilter(asCodeFilter);

      // Verify script is preserved
      expect(roundTrip.query).toEqual(scriptedRangeFilter.query);
      expect(roundTrip.meta.type).toBe('range');
      // Verify meta.field and meta.params are preserved through round-trip
      expect(roundTrip.meta.field).toBe('calculated_field');
      expect(roundTrip.meta.params).toEqual({ gte: 0, lt: 100 });
    });

    it('should handle scripted phrase filter with complex script', () => {
      const scriptedFilter: StoredFilter = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        meta: {
          field: 'bytes_per_second',
          type: 'phrase',
          negate: false,
          disabled: false,
          alias: 'High throughput',
          params: { value: 'high' },
        },
        query: {
          script: {
            script: {
              source: `
                def bytesPerSec = doc['bytes'].value / doc['duration'].value;
                if (bytesPerSec > 1000000) {
                  return params.value == 'high';
                } else {
                  return params.value == 'low';
                }
              `,
              params: { value: 'high' },
              lang: 'painless',
            },
          },
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(scriptedFilter);

      expect('dsl' in asCodeFilter).toBe(true);
      expect(asCodeFilter.pinned).toBe(true); // GLOBAL_STATE = pinned
      expect(asCodeFilter.filterType).toBe('phrase');

      // Round-trip
      const roundTrip = toStoredFilter(asCodeFilter);

      expect(roundTrip.query?.script).toBeDefined();
      expect(roundTrip.meta.type).toBe('phrase');
      expect(roundTrip.$state?.store).toBe(FilterStateStore.GLOBAL_STATE);
    });
  });

  describe('Date-Specific Range Filters', () => {
    it('should handle date range filter with strict_date_optional_time_nanos format', () => {
      const dateRangeFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          field: '@timestamp',
          type: 'range',
          negate: false,
          disabled: false,
          alias: 'January 1, 2024',
          params: {
            format: 'strict_date_optional_time_nanos',
            gte: '2024-01-01T00:00:00.000000000Z',
            lte: '2024-01-01T23:59:59.999999999Z',
          },
          key: '@timestamp',
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time_nanos',
              gte: '2024-01-01T00:00:00.000000000Z',
              lte: '2024-01-01T23:59:59.999999999Z',
            },
          },
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(dateRangeFilter);

      // Should detect as range condition
      expect('condition' in asCodeFilter).toBe(true);
      if ('condition' in asCodeFilter) {
        expect(asCodeFilter.condition.field).toBe('@timestamp');
        expect(asCodeFilter.condition.operator).toBe('range');
      }
      expect(asCodeFilter.filterType).toBe('range');
      expect(asCodeFilter.key).toBe('@timestamp');

      // Convert back to StoredFilter
      const roundTrip = toStoredFilter(asCodeFilter);

      // Verify format is present
      expect(roundTrip.query?.range?.['@timestamp']).toBeDefined();
      // NOTE: Format is currently normalized to 'strict_date_optional_time' (without _nanos)
      // This is done in convertFromSimpleCondition (line 159) for @timestamp fields
      // The _nanos precision is lost in round-trip conversion
      expect(roundTrip.query?.range?.['@timestamp'].format).toBe('strict_date_optional_time');
      expect(roundTrip.query?.range?.['@timestamp'].gte).toBe('2024-01-01T00:00:00.000000000Z');
      expect(roundTrip.query?.range?.['@timestamp'].lte).toBe('2024-01-01T23:59:59.999999999Z');
      expect(roundTrip.meta.type).toBe('range');
    });

    it('should handle date range filter with date_time format', () => {
      const dateRangeFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          field: 'event.created',
          type: 'range',
          negate: false,
          disabled: false,
          alias: null,
          params: {
            gte: '2024-01-01T00:00:00.000Z',
            lte: '2024-01-01T00:00:00.000Z',
          },
        },
        query: {
          range: {
            'event.created': {
              gte: '2024-01-01T00:00:00.000Z',
              lte: '2024-01-01T00:00:00.000Z',
            },
          },
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(dateRangeFilter);

      expect('condition' in asCodeFilter).toBe(true);
      if ('condition' in asCodeFilter) {
        expect(asCodeFilter.condition.field).toBe('event.created');
      }
      expect(asCodeFilter.filterType).toBe('range');

      // Convert back
      const roundTrip = toStoredFilter(asCodeFilter);

      expect(roundTrip.meta.type).toBe('range');
    });

    it('should handle single-value date as range with format', () => {
      // This is created when user clicks on a date value in Discover
      const singleDateFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          field: '@timestamp',
          type: 'range',
          negate: false,
          disabled: false,
          alias: null,
          params: {
            format: 'strict_date_optional_time_nanos',
            gte: '2024-11-10T15:30:00.000Z',
            lte: '2024-11-10T15:30:00.000Z',
          },
        },
        query: {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time_nanos',
              gte: '2024-11-10T15:30:00.000Z',
              lte: '2024-11-10T15:30:00.000Z',
            },
          },
        },
      };

      const asCodeFilter = fromStoredFilter(singleDateFilter);
      const roundTrip = toStoredFilter(asCodeFilter);

      // Format is normalized (see previous test for explanation)
      expect(roundTrip.query?.range?.['@timestamp'].format).toBe('strict_date_optional_time');
      // Equal gte/lte should be preserved
      expect(roundTrip.query?.range?.['@timestamp'].gte).toBe('2024-11-10T15:30:00.000Z');
      expect(roundTrip.query?.range?.['@timestamp'].lte).toBe('2024-11-10T15:30:00.000Z');
    });

    it('should handle date range created from time picker', () => {
      const timePickerFilter: StoredFilter = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        meta: {
          field: '@timestamp',
          type: 'range',
          negate: false,
          disabled: false,
          alias: 'Last 15 minutes',
          params: {
            gte: 'now-15m',
            lte: 'now',
          },
        },
        query: {
          range: {
            '@timestamp': {
              gte: 'now-15m',
              lte: 'now',
            },
          },
        },
      };

      const asCodeFilter = fromStoredFilter(timePickerFilter);
      expect('condition' in asCodeFilter).toBe(true);
      if ('condition' in asCodeFilter) {
        expect(asCodeFilter.condition.operator).toBe('range');
      }
      expect(asCodeFilter.pinned).toBe(true);

      const roundTrip = toStoredFilter(asCodeFilter);
      expect(roundTrip.query?.range?.['@timestamp'].gte).toBe('now-15m');
      expect(roundTrip.query?.range?.['@timestamp'].lte).toBe('now');
    });
  });
});
