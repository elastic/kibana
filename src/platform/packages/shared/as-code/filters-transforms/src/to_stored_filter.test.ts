/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import type { StoredFilter } from './types';
import { toStoredFilter } from './to_stored_filter';
import { fromStoredFilter } from './from_stored_filter';
import { FilterStateStore } from '@kbn/es-query-constants';
import { FILTERS } from '@kbn/es-query';
import { spatialFilterFixture } from './__fixtures__/spatial_filter';
import { isConditionFilter, isDSLFilter } from './type_guards';

describe('toStoredFilter', () => {
  describe('main conversion function', () => {
    it('should convert condition filters to stored format', () => {
      const simplified: AsCodeFilter = {
        type: 'condition',
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      };

      const result = toStoredFilter(simplified) as StoredFilter;

      // Properties not set in AsCodeFilter should not be present in StoredFilter
      expect(result.$state).toBeUndefined();
      expect(result.meta).toMatchObject({
        key: 'status',
        field: 'status',
        type: 'phrase',
      });
      // Optional properties should not be present when not set
      expect(result.meta.alias).toBeUndefined();
      expect(result.meta.disabled).toBeUndefined();
      expect(result.meta.negate).toBeUndefined();
      expect(result.query).toEqual({
        match_phrase: {
          status: 'active',
        },
      });
    });

    it('should convert group filters to bool queries', () => {
      const simplified: AsCodeFilter = {
        type: 'group',
        group: {
          operator: 'and',
          conditions: [
            { field: 'status', operator: 'is', value: 'active' },
            { field: 'type', operator: 'is', value: 'user' },
          ],
        },
      };

      const result = toStoredFilter(simplified) as StoredFilter;

      // AND groups use combined filter format
      expect(result.meta.type).toBe('combined');
      expect(result.meta.relation).toBe('AND');
      expect(Array.isArray(result.meta.params)).toBe(true);
    });

    it('should convert DSL filters', () => {
      const simplified: AsCodeFilter = {
        type: 'dsl',
        dsl: {
          query: { script: { source: 'doc.field.value > 0' } },
        },
      };

      const result = toStoredFilter(simplified) as StoredFilter;

      expect(result.query).toEqual({
        script: { source: 'doc.field.value > 0' },
      });
      expect(result.meta.type).toBe('custom');
    });

    it('should return undefined for filters with no type', () => {
      const simplified = {} as AsCodeFilter;

      expect(toStoredFilter(simplified)).toBeUndefined();
    });

    it('should handle double negation (top-level negate + condition.negate)', () => {
      // Edge case: both top-level negate and condition.negate are set with DIFFERENT values
      // Behavior: Top-level negate takes precedence (more hierarchical - outer wrapper wins)

      // Test 1: top-level=false, condition=true
      // Top-level false should override condition true
      const filter1: AsCodeFilter = {
        type: 'condition',
        negate: false, // Top-level negate (final say)
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
          negate: true, // Condition-level negate (suggestion)
        },
      };

      const result1 = toStoredFilter(filter1) as StoredFilter;

      // Top-level negate=false overrides condition.negate=true via spread operator
      expect(result1.meta.negate).toBeUndefined(); // false is not preserved (no explicit negate property)
      expect(result1.query).toEqual({
        match_phrase: {
          status: 'active',
        },
      });

      // Test 2: top-level=true, condition=false (explicit)
      // Top-level true should win
      const filter2: AsCodeFilter = {
        type: 'condition',
        negate: true, // Top-level negate (final say)
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
          negate: false, // Condition-level negate (explicit false)
        },
      };

      const result2 = toStoredFilter(filter2) as StoredFilter;

      // Top-level negate=true wins (spread order: condition first, then baseMeta)
      expect(result2.meta.negate).toBe(true);

      // Test 3: Round-trip scenario - user can now "un-negate" a negated filter
      // Start with a negated stored filter
      const originalNegatedFilter: StoredFilter = {
        meta: {
          negate: true,
          type: 'phrase',
          key: 'status',
          field: 'status',
          params: { query: 'active' },
        },
        query: {
          match_phrase: {
            status: 'active',
          },
        },
      };

      // Convert to AsCode - should have condition.negate=true
      const asCodeFromNegated = fromStoredFilter(originalNegatedFilter) as AsCodeFilter;
      expect(isConditionFilter(asCodeFromNegated)).toBe(true);
      if (isConditionFilter(asCodeFromNegated)) {
        expect(asCodeFromNegated.condition.negate).toBe(true);
      }

      // Now add top-level negate=false (user wants to "un-negate" the filter)
      const unnegatedAsCode: AsCodeFilter = {
        ...asCodeFromNegated,
        negate: false, // Top-level should override condition.negate
      };

      // Convert back to stored
      const result3 = toStoredFilter(unnegatedAsCode) as StoredFilter;

      // Result: Top-level negate=false now wins! Filter is un-negated.
      expect(result3.meta.negate).toBeUndefined(); // false doesn't create a negate property
    });

    it('should handle group filter with nested negate condition and top-level negate', () => {
      // Test: group filter with top-level negate AND a nested condition with condition.negate
      const filterWithGroupDoubleNegate: AsCodeFilter = {
        type: 'group',
        negate: true, // Top-level negate on the group
        group: {
          operator: 'and',
          conditions: [
            {
              field: 'status',
              operator: 'is',
              value: 'active',
              negate: true, // Nested condition-level negate
            },
          ],
        },
      };

      const result = toStoredFilter(filterWithGroupDoubleNegate) as StoredFilter;

      // Group filter becomes a combined filter with negate=true at the top level
      expect(result.meta.type).toBe(FILTERS.COMBINED);
      expect(result.meta.negate).toBe(true); // Top-level negate from the group

      // The nested condition should have its own negate
      const nestedFilter = result.meta.params?.[0];
      expect(nestedFilter).toBeDefined();
      expect(nestedFilter.meta.negate).toBe(true); // condition.negate from the nested condition

      // So both negations are preserved independently in the output structure
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

      const asCodeFilter = fromStoredFilter(originalFilter) as AsCodeFilter;
      const roundTripFilter = toStoredFilter(asCodeFilter) as StoredFilter;

      // negate: false is not preserved in round-trip for condition filters
      // because negation is encoded in the operator (is_one_of vs is_not_one_of)
      // $state.store (pinned) is also not preserved as it's UI state only
      const { negate, ...metaWithoutNegate } = originalFilter.meta;
      const { $state, ...filterWithoutState } = originalFilter;
      const expectedFilter = { ...filterWithoutState, meta: metaWithoutNegate };

      expect(roundTripFilter).toEqual(expectedFilter);
    });

    it('should preserve spatial filter data through round-trip conversion', () => {
      const originalFilter = spatialFilterFixture as StoredFilter;

      // Convert to SimpleFilter
      const simpleFilter = fromStoredFilter(originalFilter) as AsCodeFilter;

      // Convert back to StoredFilter
      const roundTripFilter = toStoredFilter(simpleFilter) as StoredFilter;

      // Verify core query is preserved
      expect(roundTripFilter.query).toEqual(originalFilter.query);

      // Verify base properties are preserved
      expect(roundTripFilter.meta.alias).toBe(originalFilter.meta.alias);
      expect(roundTripFilter.meta.disabled).toBe(originalFilter.meta.disabled);
      expect(roundTripFilter.meta.negate).toBe(originalFilter.meta.negate);

      // Verify meta.type is preserved
      expect(roundTripFilter.meta.type).toBe(originalFilter.meta.type);

      // Verify isMultiIndex is preserved
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
      const asCodeFilter = fromStoredFilter(scriptedPhraseFilter) as AsCodeFilter;

      // Should be converted to DSL format (scripted filters are complex)
      expect(isDSLFilter(asCodeFilter)).toBe(true);
      if (isDSLFilter(asCodeFilter)) {
        expect(asCodeFilter.dsl.query).toEqual(scriptedPhraseFilter.query);
      }
      expect(asCodeFilter.label).toBe('Scripted calculation equals 100');

      // Convert back to StoredFilter
      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;

      // Verify script is preserved
      expect(roundTrip.query).toEqual(scriptedPhraseFilter.query);
      expect(roundTrip.meta.type).toBe('custom');
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
      const asCodeFilter = fromStoredFilter(scriptedRangeFilter) as AsCodeFilter;

      // Should be converted to DSL format
      expect(isDSLFilter(asCodeFilter)).toBe(true);
      if (isDSLFilter(asCodeFilter)) {
        expect(asCodeFilter.dsl.query).toEqual(scriptedRangeFilter.query);
      }
      expect(asCodeFilter.label).toBe('Scripted calculation between 0 and 100');

      // Convert back to StoredFilter
      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;

      // Verify script is preserved
      expect(roundTrip.query).toEqual(scriptedRangeFilter.query);
      expect(roundTrip.meta.type).toBe('custom');
      // Verify meta.field and meta.params are preserved through round-trip
      expect(roundTrip.meta.field).toBe('calculated_field');
      expect(roundTrip.meta.params).toEqual({ gte: 0, lt: 100 });
    });

    it('should handle scripted phrase filter with complex script', () => {
      const scriptedFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
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
      const asCodeFilter = fromStoredFilter(scriptedFilter) as AsCodeFilter;

      expect(isDSLFilter(asCodeFilter)).toBe(true);

      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;

      expect(roundTrip.query?.script).toBeDefined();
      expect(roundTrip.meta.type).toBe('custom');
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
      const asCodeFilter = fromStoredFilter(dateRangeFilter) as AsCodeFilter;

      // Should detect as range condition
      expect(isConditionFilter(asCodeFilter)).toBe(true);
      if (isConditionFilter(asCodeFilter)) {
        expect(asCodeFilter.condition.field).toBe('@timestamp');
        expect(asCodeFilter.condition.operator).toBe('range');
      }

      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;

      // Verify format is preserved through round-trip
      expect(roundTrip.query?.range?.['@timestamp']).toBeDefined();
      expect(roundTrip.query?.range?.['@timestamp'].format).toBe('strict_date_optional_time_nanos');
      expect(roundTrip.query?.range?.['@timestamp'].gte).toBe('2024-01-01T00:00:00.000000000Z');
      expect(roundTrip.query?.range?.['@timestamp'].lte).toBe('2024-01-01T23:59:59.999999999Z');
      expect(roundTrip.meta.type).toBe('range');
      expect(roundTrip.meta.key).toBe('@timestamp');
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
      const asCodeFilter = fromStoredFilter(dateRangeFilter) as AsCodeFilter;

      expect(isConditionFilter(asCodeFilter)).toBe(true);
      if (isConditionFilter(asCodeFilter)) {
        expect(asCodeFilter.condition.field).toBe('event.created');
      }

      // Convert back
      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;

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

      const asCodeFilter = fromStoredFilter(singleDateFilter) as AsCodeFilter;
      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;

      // Format is now preserved through round-trip
      expect(roundTrip.query?.range?.['@timestamp'].format).toBe('strict_date_optional_time_nanos');
      // Equal gte/lte should be preserved
      expect(roundTrip.query?.range?.['@timestamp'].gte).toBe('2024-11-10T15:30:00.000Z');
      expect(roundTrip.query?.range?.['@timestamp'].lte).toBe('2024-11-10T15:30:00.000Z');
    });

    it('should handle date range created from time picker', () => {
      const timePickerFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
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

      const asCodeFilter = fromStoredFilter(timePickerFilter) as AsCodeFilter;
      expect(isConditionFilter(asCodeFilter)).toBe(true);
      if (isConditionFilter(asCodeFilter)) {
        expect(asCodeFilter.condition.operator).toBe('range');
      }

      const roundTrip = toStoredFilter(asCodeFilter) as StoredFilter;
      expect(roundTrip.query?.range?.['@timestamp'].gte).toBe('now-15m');
      expect(roundTrip.query?.range?.['@timestamp'].lte).toBe('now');
    });
  });

  describe('Negated phrases filter conversion', () => {
    it('should convert condition.negate with one_of to phrases filter with negate', () => {
      const asCodeFilter: AsCodeFilter = {
        type: 'condition',
        condition: {
          field: 'Carrier',
          operator: 'is_one_of',
          value: ['ES-Air', 'Kibana Airlines', 'Logstash Airways'],
          negate: true,
        },
      };

      const storedFilter = toStoredFilter(asCodeFilter) as StoredFilter;

      expect(storedFilter.meta.type).toBe('phrases');
      expect(storedFilter.meta.negate).toBe(true);
      expect(storedFilter.meta.key).toBe('Carrier');
      expect(storedFilter.meta.field).toBe('Carrier');
      expect(storedFilter.meta.params).toEqual(['ES-Air', 'Kibana Airlines', 'Logstash Airways']);

      // Should use bool/should structure with match_phrase queries
      expect(storedFilter.query).toHaveProperty('bool.should');
      expect(storedFilter.query?.bool?.should).toHaveLength(3);
      expect(storedFilter.query?.bool?.should?.[0]).toEqual({
        match_phrase: { Carrier: 'ES-Air' },
      });
      expect(storedFilter.query?.bool?.minimum_should_match).toBe(1);
    });

    it('should preserve condition.negate true through round-trip conversion (phrases)', () => {
      // Original phrases filter with negation (like "Carrier is not one of...")
      const originalFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          alias: null,
          disabled: false,
          negate: true,
          type: 'phrases',
          key: 'Carrier',
          field: 'Carrier',
          params: ['ES-Air', 'Kibana Airlines', 'Logstash Airways'],
          index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
        query: {
          bool: {
            should: [
              { match_phrase: { Carrier: 'ES-Air' } },
              { match_phrase: { Carrier: 'Kibana Airlines' } },
              { match_phrase: { Carrier: 'Logstash Airways' } },
            ],
            minimum_should_match: 1,
          },
        },
      };

      // Convert to AsCodeFilter (should set condition.negate=true rather than negative operator)
      const asCodeFilter = fromStoredFilter(originalFilter) as AsCodeFilter;

      // Verify it converted to IS_NOT_ONE_OF
      expect(isConditionFilter(asCodeFilter)).toBe(true);
      if (isConditionFilter(asCodeFilter)) {
        expect(asCodeFilter.condition.operator).toBe('is_one_of');
        expect(asCodeFilter.condition.negate).toBe(true);
        expect(asCodeFilter.condition.field).toBe('Carrier');
        if ('value' in asCodeFilter.condition) {
          expect(asCodeFilter.condition.value).toEqual([
            'ES-Air',
            'Kibana Airlines',
            'Logstash Airways',
          ]);
        }
      }

      // Convert back to StoredFilter
      const roundTripFilter = toStoredFilter(asCodeFilter) as StoredFilter;

      // Should still be a phrases filter with negate: true
      expect(roundTripFilter.meta.type).toBe('phrases');
      expect(roundTripFilter.meta.negate).toBe(true);
      expect(roundTripFilter.meta.params).toEqual([
        'ES-Air',
        'Kibana Airlines',
        'Logstash Airways',
      ]);
    });

    it('should convert OR group of negated phrase conditions to combined filter', () => {
      // Group filter like "Carrier is not A OR Carrier is not B OR Carrier is not C"
      const asCodeFilter: AsCodeFilter = {
        type: 'group',
        group: {
          operator: 'or',
          conditions: [
            {
              field: 'Carrier',
              operator: 'is',
              value: 'ES-Air',
              negate: true,
            },
            {
              field: 'Carrier',
              operator: 'is',
              value: 'Kibana Airlines',
              negate: true,
            },
            {
              field: 'Carrier',
              operator: 'is',
              value: 'Logstash Airways',
              negate: true,
            },
          ],
        },
      };

      const storedFilter = toStoredFilter(asCodeFilter) as StoredFilter;

      // Should be converted to a combined filter with OR relation
      expect(storedFilter.meta.type).toBe('combined');
      expect(storedFilter.meta.relation).toBe('OR');
      expect(Array.isArray(storedFilter.meta.params)).toBe(true);

      // Each nested condition should preserve its own negate
      const params = storedFilter.meta.params as StoredFilter[];
      expect(params).toHaveLength(3);
      expect(params[0].meta.negate).toBe(true);
      expect(params[1].meta.negate).toBe(true);
      expect(params[2].meta.negate).toBe(true);
    });

    it('should preserve condition.negate for negated range filters through round-trip', () => {
      // Range filters do NOT have an opposition operator (unlike IS/IS_NOT, EXISTS/NOT_EXISTS)
      // so negate must be preserved through round-trip conversion
      const originalFilter: StoredFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          disabled: false,
          negate: true, // CRITICAL: Must be preserved
          type: 'range',
          key: 'bytes',
          field: 'bytes',
          params: { gte: 1000, lte: 5000 },
          index: 'test-index',
        },
        query: {
          range: {
            bytes: { gte: 1000, lte: 5000 },
          },
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(originalFilter);
      expect(asCodeFilter).toBeDefined();

      // Verify negate is preserved
      if (asCodeFilter && 'condition' in asCodeFilter) {
        expect(asCodeFilter.condition.negate).toBe(true);
      }

      // Verify it's a condition filter with range operator
      expect(isConditionFilter(asCodeFilter!)).toBe(true);
      if (isConditionFilter(asCodeFilter!)) {
        expect(asCodeFilter!.condition.operator).toBe('range');
        expect(asCodeFilter!.condition.field).toBe('bytes');
        if ('value' in asCodeFilter!.condition) {
          expect(asCodeFilter!.condition.value).toEqual({ gte: 1000, lte: 5000 });
        }
      }

      // Convert back to StoredFilter
      const roundTripFilter = toStoredFilter(asCodeFilter!) as StoredFilter;

      // CRITICAL: negate must be preserved through round-trip
      expect(roundTripFilter.meta.negate).toBe(true);
      expect(roundTripFilter.meta.type).toBe('range');
      expect(roundTripFilter.meta.key).toBe('bytes');
      expect(roundTripFilter.query?.range?.bytes).toEqual({ gte: 1000, lte: 5000 });
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve phrases filter structure through round-trip conversion', () => {
      // This is the exact stored filter from the dashboard
      const originalStoredFilter: StoredFilter = {
        meta: {
          disabled: false,
          negate: true,
          alias: null,
          index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          key: 'Carrier',
          field: 'Carrier',
          params: ['ES-Air', 'JetBeats', 'Kibana Airlines'],
          type: 'phrases',
        },
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              { match_phrase: { Carrier: 'ES-Air' } },
              { match_phrase: { Carrier: 'JetBeats' } },
              { match_phrase: { Carrier: 'Kibana Airlines' } },
            ],
          },
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      };

      // Convert to AsCodeFilter
      const asCodeFilter = fromStoredFilter(originalStoredFilter) as AsCodeFilter;

      // Convert back to StoredFilter
      const roundTripFilter = toStoredFilter(asCodeFilter) as StoredFilter;

      // The structure should remain the same
      expect(roundTripFilter.meta.type).toBe('phrases');
      expect(roundTripFilter.meta.negate).toBe(true);
      expect(roundTripFilter.meta.key).toBe('Carrier');
      expect(roundTripFilter.meta.params).toEqual(['ES-Air', 'JetBeats', 'Kibana Airlines']);

      // Should have the same bool/should/match_phrase structure
      expect(roundTripFilter.query).toHaveProperty('bool.should');
      expect(roundTripFilter.query?.bool?.minimum_should_match).toBe(1);

      const should = roundTripFilter.query?.bool?.should as Array<{
        match_phrase: Record<string, unknown>;
      }>;
      expect(should).toHaveLength(3);
      expect(should[0]).toEqual({ match_phrase: { Carrier: 'ES-Air' } });
      expect(should[1]).toEqual({ match_phrase: { Carrier: 'JetBeats' } });
      expect(should[2]).toEqual({ match_phrase: { Carrier: 'Kibana Airlines' } });
    });

    it('should preserve filters with bool.must containing multiple different query types AS DSL (not group)', () => {
      // A filter with bool.must containing different query types (match_phrase + range)
      // WITHOUT meta.type, this should be preserved as DSL to avoid data loss
      const originalFilter: StoredFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        query: {
          bool: {
            must: [
              {
                match_phrase: {
                  message: 'error',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2024-01-01',
                    lte: '2024-12-31',
                  },
                },
              },
            ],
          },
        },
      };

      // Convert to AsCode format
      const asCodeFilter = fromStoredFilter(originalFilter) as AsCodeFilter;

      // Should be a DSL filter - bool queries without meta.type preserved as DSL
      expect(isDSLFilter(asCodeFilter)).toBe(true);

      if (isDSLFilter(asCodeFilter)) {
        expect(asCodeFilter.dsl.query).toEqual({
          bool: {
            must: [
              {
                match_phrase: {
                  message: 'error',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2024-01-01',
                    lte: '2024-12-31',
                  },
                },
              },
            ],
          },
        });
      }

      // Round-trip back to stored format
      const roundTripped = toStoredFilter(asCodeFilter) as StoredFilter;

      // Both queries should be preserved
      expect(roundTripped.query?.bool?.must).toEqual([
        {
          match_phrase: {
            message: 'error',
          },
        },
        {
          range: {
            '@timestamp': {
              gte: '2024-01-01',
              lte: '2024-12-31',
            },
          },
        },
      ]);
    });

    it('should handle single query filter with incomplete metadata as DSL', () => {
      // A filter that has query but incomplete metadata (no meta.type)
      // These should be preserved as DSL to avoid ambiguity
      const singleQueryFilter: StoredFilter = {
        meta: {
          // Incomplete metadata - no type, no key
          disabled: false,
          negate: false,
          alias: null,
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        query: {
          match_phrase: {
            message: 'error occurred',
          },
        },
      };

      const asCodeFilter = fromStoredFilter(singleQueryFilter) as AsCodeFilter;

      // Should be preserved as DSL since there's no meta.type
      expect(isDSLFilter(asCodeFilter)).toBe(true);
      if (isDSLFilter(asCodeFilter)) {
        expect(asCodeFilter.dsl.query).toEqual({
          match_phrase: {
            message: 'error occurred',
          },
        });
      }
    });

    it('should preserve complex bool.should queries without simplifying', () => {
      // A complex filter that shouldn't be simplified
      const complexFilter: StoredFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        query: {
          bool: {
            should: [
              {
                match_phrase: {
                  'error.message': 'timeout',
                },
              },
              {
                match_phrase: {
                  'error.message': 'connection refused',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      };

      const asCodeFilter = fromStoredFilter(complexFilter) as AsCodeFilter;

      // Should NOT be a simple condition - should be group or DSL
      expect(isConditionFilter(asCodeFilter)).toBe(false);

      // Should be either a group filter or DSL
      const isGroupOrDSL = 'group' in asCodeFilter || 'dsl' in asCodeFilter;
      expect(isGroupOrDSL).toBe(true);
    });

    it('should preserve bool query with BOTH must and should clauses as DSL (prevents data loss)', () => {
      // A filter with bool query that has BOTH must and should clauses
      // This prevents the Strategy 3 Bug that would convert to group and lose should clause
      const complexBoolFilter: StoredFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        query: {
          bool: {
            must: [
              {
                term: {
                  'extension.keyword': 'css',
                },
              },
              {
                term: {
                  'machine.os.keyword': 'ios',
                },
              },
            ],
            should: [
              {
                range: {
                  'machine.ram': {
                    gte: '500',
                  },
                },
              },
            ],
            minimum_should_match: 0, // This makes should optional
          },
        },
      };

      // Convert to AsCode format
      const asCodeFilter = fromStoredFilter(complexBoolFilter) as AsCodeFilter;

      // Should be a DSL filter - preserves complex bool structure
      expect(isDSLFilter(asCodeFilter)).toBe(true);

      if (isDSLFilter(asCodeFilter)) {
        expect(asCodeFilter.dsl.query).toEqual({
          bool: {
            must: [
              {
                term: {
                  'extension.keyword': 'css',
                },
              },
              {
                term: {
                  'machine.os.keyword': 'ios',
                },
              },
            ],
            should: [
              {
                range: {
                  'machine.ram': {
                    gte: '500',
                  },
                },
              },
            ],
            minimum_should_match: 0,
          },
        });
      }

      // Round-trip to verify NO data loss
      const roundTripped = toStoredFilter(asCodeFilter) as StoredFilter;

      // The should clause is PRESERVED (not lost!)
      if ('query' in roundTripped && roundTripped.query?.bool) {
        expect(roundTripped.query.bool.should).toBeDefined();
        expect(roundTripped.query.bool.must).toBeDefined();
        expect(roundTripped.query.bool.must).toHaveLength(2);
        expect(roundTripped.query.bool.should).toHaveLength(1);
      }
    });

    it('should preserve bool.must with single query as DSL', () => {
      // Single-clause bool.must goes to DSL fallback since it can't be simplified
      const boolMustFilter: StoredFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        query: {
          bool: {
            must: [
              {
                term: {
                  status: 'active',
                },
              },
            ],
          },
        },
      };

      const asCodeFilter = fromStoredFilter(boolMustFilter) as AsCodeFilter;

      // Should be preserved as DSL
      expect(isDSLFilter(asCodeFilter)).toBe(true);

      if (isDSLFilter(asCodeFilter)) {
        expect(asCodeFilter.dsl.query).toEqual({
          bool: {
            must: [
              {
                term: {
                  status: 'active',
                },
              },
            ],
          },
        });
      }
    });

    it('should handle nested combined filters and strip $state from sub-filters during round-trip', () => {
      // Complex nested combined filter structure
      // Note: The input has $state on nested filters, but buildCombinedFilter strips these
      const nestedCombinedFilter: StoredFilter = {
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        meta: {
          type: 'combined',
          relation: 'AND',
          params: [
            {
              query: {
                match_phrase: {
                  'extension.keyword': 'deb',
                },
              },
              meta: {
                negate: true,
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                key: 'extension.keyword',
                field: 'extension.keyword',
                params: {
                  query: 'deb',
                },
                type: 'phrase',
                disabled: false,
              },
            },
            {
              $state: {
                store: FilterStateStore.APP_STATE,
              },
              meta: {
                type: 'combined',
                relation: 'OR',
                params: [
                  {
                    query: {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            match_phrase: {
                              'machine.os.keyword': 'ios',
                            },
                          },
                          {
                            match_phrase: {
                              'machine.os.keyword': 'osx',
                            },
                          },
                          {
                            match_phrase: {
                              'machine.os.keyword': 'win 8',
                            },
                          },
                        ],
                      },
                    },
                    meta: {
                      negate: true,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'machine.os.keyword',
                      field: 'machine.os.keyword',
                      params: ['ios', 'osx', 'win 8'],
                      value: ['ios', 'osx', 'win 8'],
                      type: 'phrases',
                      disabled: false,
                    },
                  },
                  {
                    $state: {
                      store: FilterStateStore.APP_STATE,
                    },
                    meta: {
                      type: 'combined',
                      relation: 'AND',
                      params: [
                        {
                          query: {
                            exists: {
                              field: 'geo.dest',
                            },
                          },
                          meta: {
                            negate: true,
                            index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                            key: 'geo.dest',
                            field: 'geo.dest',
                            value: 'exists',
                            type: 'exists',
                            disabled: false,
                          },
                        },
                        {
                          meta: {
                            negate: false,
                            index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                            key: 'geo.src',
                            field: 'geo.src',
                            value: 'exists',
                            type: 'exists',
                            disabled: false,
                          },
                          query: {
                            exists: {
                              field: 'geo.src',
                            },
                          },
                        },
                      ],
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      disabled: false,
                      negate: false,
                    },
                  },
                ],
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                disabled: false,
                negate: false,
              },
            },
          ],
          disabled: false,
          negate: false,
          alias: null,
        },
        query: {},
      };

      // Convert to AsCodeFilter and back
      const asCodeFilter = fromStoredFilter(nestedCombinedFilter);
      expect(asCodeFilter).toBeDefined();

      const roundTripped = toStoredFilter(asCodeFilter!) as StoredFilter;

      // Verify top-level structure
      expect(roundTripped.meta.type).toBe('combined');
      expect(roundTripped.meta.relation).toBe('AND');
      expect(Array.isArray(roundTripped.meta.params)).toBe(true);
      expect(roundTripped.meta.params).toHaveLength(2);

      // Verify first param is a simple phrase filter
      const firstParam = roundTripped.meta.params[0] as StoredFilter;
      expect(firstParam.meta.type).toBe('phrase');
      expect(firstParam.meta.key).toBe('extension.keyword');

      // Verify second param is a nested combined filter
      // The buildCombinedFilter function strips $state from all sub-filters
      const secondParam = roundTripped.meta.params[1] as StoredFilter;
      expect(secondParam.meta.type).toBe('combined');
      expect(secondParam.meta.relation).toBe('OR');
      expect(Array.isArray(secondParam.meta.params)).toBe(true);
      expect(secondParam.meta.params).toHaveLength(2);

      // Verify deeply nested combined filter
      const nestedCombinedInOr = secondParam.meta.params[1] as StoredFilter;
      expect(nestedCombinedInOr.meta.type).toBe('combined');
      expect(nestedCombinedInOr.meta.relation).toBe('AND');
    });
  });
});
