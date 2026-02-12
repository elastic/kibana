/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import { FilterStateStore } from '@kbn/es-query-constants';
import { fromStoredFilter } from './from_stored_filter';
import {
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isSpatialFilter,
  isRangeConditionFilter,
} from './type_guards';
import { spatialFilterFixture } from './__fixtures__/spatial_filter';

describe('fromStoredFilter', () => {
  describe('Input validation', () => {
    it('should return undefined for null/undefined input when logger provided', () => {
      const mockLogger = {
        warn: jest.fn(),
      } as any;

      const resultNull = fromStoredFilter(null, mockLogger);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to convert stored filter')
      );
      expect(resultNull).toBeUndefined();

      mockLogger.warn.mockClear();

      const resultUndefined = fromStoredFilter(undefined, mockLogger);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to convert stored filter')
      );
      expect(resultUndefined).toBeUndefined();
    });

    it('should return undefined for null/undefined input without logger', () => {
      const resultNull = fromStoredFilter(null);
      expect(resultNull).toBeUndefined();

      const resultUndefined = fromStoredFilter(undefined);
      expect(resultUndefined).toBeUndefined();
    });

    it('should skip pinned filters (globalState)', () => {
      // Pinned filters are UI-level state and should not be persisted in AsCodeFilter format
      const pinnedFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          key: 'status',
          field: 'status',
          type: 'phrase',
        },
        query: {
          match_phrase: {
            status: 'active',
          },
        },
        $state: { store: FilterStateStore.GLOBAL_STATE },
      };

      const result = fromStoredFilter(pinnedFilter);
      expect(result).toBeUndefined();
    });
  });

  describe('Legacy filter migration', () => {
    it('should migrate legacy range filter with top-level range property', () => {
      // Legacy Kibana filter format: top-level range property
      const legacyRangeFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          key: 'bytes',
          field: 'bytes',
          params: { gte: '3000' },
          type: 'range',
        },
        range: { bytes: { gte: '3000' } },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(legacyRangeFilter) as AsCodeFilter;

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'bytes',
          operator: 'range',
          value: { gte: '3000' },
        });
      }
    });

    it('should migrate legacy phrase filter with top-level match_phrase', () => {
      // Legacy Kibana filter format: top-level match_phrase property
      const legacyPhraseFilter = {
        meta: {
          alias: null,
          disabled: false,
          field: 'geo.src',
          key: 'geo.src',
          negate: false,
          params: { query: 'CN' },
          type: 'phrase',
        },
        match_phrase: { 'geo.src': 'CN' },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(legacyPhraseFilter) as AsCodeFilter;

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'geo.src',
          operator: 'is',
          value: 'CN',
        });
      }
    });

    it('should migrate legacy exists filter with top-level exists property', () => {
      // Legacy Kibana filter format: top-level exists property
      const legacyExistsFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          key: 'user.name',
          type: 'exists',
        },
        exists: { field: 'user.name' },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(legacyExistsFilter) as AsCodeFilter;

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'user.name',
          operator: 'exists',
        });
      }
    });

    it('should migrate legacy match_all filter', () => {
      // Legacy Kibana filter format: top-level match_all property
      const legacyMatchAllFilter = {
        meta: {
          disabled: false,
          negate: false,
          alias: 'All documents',
          type: 'match_all',
        },
        match_all: {},
        $state: { store: FilterStateStore.APP_STATE },
      };

      const result = fromStoredFilter(legacyMatchAllFilter) as AsCodeFilter;

      // match_all gets preserved as DSL since it's a special case
      expect(isDSLFilter(result) || isConditionFilter(result)).toBe(true);
    });
  });

  describe('Type-based routing: Condition filters (phrase, exists, range)', () => {
    it('should convert phrase filters from meta.params', () => {
      const storedFilter = {
        meta: {
          type: 'phrase',
          key: 'status',
          params: { query: 'active' },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'status',
          operator: 'is',
          value: 'active',
        });
      }
    });

    it('should handle negated filters', () => {
      const storedFilter = {
        meta: { key: 'status', negate: true, type: 'phrase' },
        query: {
          match_phrase: {
            status: 'inactive',
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition.operator).toBe('is');
        expect(result.condition.negate).toBe(true);
      }
    });

    it('should preserve negate property for negated range filter', () => {
      const negatedRangeFilter = {
        meta: {
          disabled: false,
          negate: true,
          alias: null,
          key: 'bytes',
          field: 'bytes',
          params: { gte: 1000, lte: 5000 },
          type: 'range',
          index: 'test-index',
        },
        query: {
          range: {
            bytes: { gte: 1000, lte: 5000 },
          },
        },
        $state: { store: 'appState' },
      };

      const result = fromStoredFilter(negatedRangeFilter);

      expect(result).toBeDefined();
      expect(isConditionFilter(result!)).toBe(true);
      if (isRangeConditionFilter(result!)) {
        expect(result.condition.negate).toBe(true);
      }

      if (isConditionFilter(result!)) {
        expect(result!.condition).toEqual({
          field: 'bytes',
          operator: 'range',
          value: { gte: 1000, lte: 5000 },
          negate: true,
        });
        expect(result!.data_view_id).toBe('test-index');
      }
    });
  });

  describe('Fallback behavior: Filters without meta.type (preserved as DSL)', () => {
    it('should preserve match_phrase query as DSL when meta.type is missing', () => {
      const storedFilter = {
        meta: { key: 'message' },
        query: {
          match_phrase: {
            message: 'error occurred',
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl.query).toEqual({
          match_phrase: {
            message: 'error occurred',
          },
        });
      }
    });

    it('should preserve match_phrase queries with object values as DSL', () => {
      const storedFilter = {
        meta: {},
        query: {
          match_phrase: {
            message: { query: 'error occurred' },
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl.query).toEqual({
          match_phrase: {
            message: { query: 'error occurred' },
          },
        });
      }
    });

    it('should preserve match queries as DSL when meta.type is missing', () => {
      const storedFilter = {
        meta: {},
        query: {
          match: {
            message: 'test message',
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl.query).toEqual({
          match: {
            message: 'test message',
          },
        });
      }
    });
  });

  describe('Type-based routing: Group filters (combined filters)', () => {
    it('should preserve boolean group filters without meta.type as DSL (not group)', () => {
      // Bool queries without meta.type='combined' are preserved as DSL to prevent data loss
      const storedFilter = {
        meta: {},
        query: {
          bool: {
            must: [{ term: { status: 'active' } }, { term: { type: 'user' } }],
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      // Should be DSL to preserve bool structure
      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        const queryStr = JSON.stringify(result.dsl);
        expect(queryStr.includes('status')).toBe(true);
        expect(queryStr.includes('active')).toBe(true);
        expect(queryStr.includes('type')).toBe(true);
        expect(queryStr.includes('user')).toBe(true);
      }
    });

    it('should preserve custom filters as DSL even with simple bool queries', () => {
      const storedFilter = {
        meta: {
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
        },
        $state: {
          store: 'appState',
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
          },
        },
      };
      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      // Custom filters are always preserved as DSL, even if they could be simplified
      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl.query).toEqual(storedFilter.query);
      }
    });

    it('should preserve custom filters with complex bool queries as DSL', () => {
      const storedFilter = {
        meta: {
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
        },
        $state: {
          store: 'appState',
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
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      // Custom filters should be preserved as DSL to avoid losing complex query structures
      // (e.g., bool queries with both must and should clauses)
      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        // Verify the entire query structure is preserved, including both must and should clauses
        expect(result.dsl.query).toEqual(storedFilter.query);
      }
    });

    it('should convert combined filters with nested groups', () => {
      const storedFilter = {
        $state: {
          store: 'appState',
        },
        meta: {
          type: 'combined',
          relation: 'AND',
          params: [
            {
              query: {
                match_phrase: {
                  'machine.os.keyword': 'win 7',
                },
              },
              meta: {
                negate: true,
                index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                key: 'machine.os.keyword',
                field: 'machine.os.keyword',
                params: {
                  query: 'win 7',
                },
                type: 'phrase',
                disabled: false,
              },
            },
            {
              $state: {
                store: 'appState',
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
                              'geo.src': 'US',
                            },
                          },
                        ],
                      },
                    },
                    meta: {
                      negate: false,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'geo.src',
                      field: 'geo.src',
                      params: ['US'],
                      value: ['US'],
                      type: 'phrases',
                      disabled: false,
                    },
                  },
                  {
                    meta: {
                      negate: false,
                      index: '90943e30-9a47-11e8-b64d-95841ca0b247',
                      key: 'host.keyword',
                      field: 'host.keyword',
                      params: {
                        query: 'www.elastic.co',
                      },
                      type: 'phrase',
                      disabled: false,
                    },
                    query: {
                      match_phrase: {
                        'host.keyword': 'www.elastic.co',
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
          alias: null,
        },
        query: {},
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isGroupFilter(result)).toBe(true);
      if (isGroupFilter(result)) {
        expect(result.group).toEqual({
          operator: 'and',
          conditions: [
            {
              field: 'machine.os.keyword',
              operator: 'is',
              value: 'win 7',
              negate: true,
            },
            {
              operator: 'or',
              conditions: [
                {
                  field: 'geo.src',
                  operator: 'is_one_of',
                  value: ['US'],
                },
                {
                  field: 'host.keyword',
                  operator: 'is',
                  value: 'www.elastic.co',
                },
              ],
            },
          ],
        });
      }
    });
  });

  describe('Type-based routing: DSL filters (custom, spatial, script queries)', () => {
    it('should preserve script queries as DSL', () => {
      const storedFilter = {
        meta: {},
        query: {
          script: {
            script: {
              source: "doc['field'].value > params.threshold",
              params: { threshold: 100 },
            },
          },
        },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl).toEqual({
          query: storedFilter.query,
        });
      }
    });

    it('should preserve spatial filters with geo_shape queries as spatial type', () => {
      const spatialFilter = spatialFilterFixture;

      const result = fromStoredFilter(spatialFilter) as AsCodeFilter;

      // Should be converted to spatial filter type (not DSL)
      expect(isSpatialFilter(result)).toBe(true);
      if (isSpatialFilter(result)) {
        expect(result.dsl.query).toEqual(spatialFilter.query);
        expect(result.label).toBe('intersects shape');
        expect(result.disabled).toBe(false);
        expect(result.negate).toBe(false);
      }
    });

    it('should preserve is_multi_index property in meta for spatial filters', () => {
      const spatialFilter = spatialFilterFixture;

      const result = fromStoredFilter(spatialFilter) as AsCodeFilter;

      // Verify is_multi_index is extracted from meta
      expect(isSpatialFilter(result)).toBe(true);
      expect(result.is_multi_index).toBe(true);
    });
  });

  describe('Base properties extraction', () => {
    it('should extract disabled and label properties', () => {
      const storedFilter = {
        $state: { store: FilterStateStore.APP_STATE },
        meta: {
          key: 'status',
          type: 'phrase',
          disabled: true,
          alias: 'Status Filter',
          negate: true,
        },
        query: { match_phrase: { status: 'active' } },
      };

      const result = fromStoredFilter(storedFilter) as AsCodeFilter;

      expect(result.disabled).toBe(true);
      expect(result.label).toBe('Status Filter');
      // For condition filters, negation is represented as condition.negate
      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition.operator).toBe('is');
        expect(result.condition.negate).toBe(true);
      }
    });
  });
});
