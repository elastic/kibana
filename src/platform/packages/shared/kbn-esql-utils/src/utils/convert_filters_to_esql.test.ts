/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, CombinedFilter } from '@kbn/es-query';
import { BooleanRelation, FILTERS } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from './convert_filters_to_esql';

describe('convertFiltersToESQLExpression', () => {
  describe('empty and disabled filters', () => {
    it('should return empty expression for empty array', () => {
      const result = convertFiltersToESQLExpression([]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toEqual([]);
    });

    it('should skip disabled filters', () => {
      const filter: Filter = {
        meta: { disabled: true, key: 'status' },
        query: { match_phrase: { status: 200 } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toEqual([]);
    });
  });

  describe('phrase filter', () => {
    it('should translate a string phrase filter', () => {
      const filter: Filter = {
        meta: { key: 'machine.os' },
        query: { match_phrase: { 'machine.os': 'ios' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`machine.os` : "ios"');
      expect(result.untranslatableFilters).toEqual([]);
    });

    it('should translate a numeric phrase filter', () => {
      const filter: Filter = {
        meta: { key: 'status' },
        query: { match_phrase: { status: 200 } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`status` : 200');
    });

    it('should translate a boolean phrase filter', () => {
      const filter: Filter = {
        meta: { key: 'active' },
        query: { match_phrase: { active: true } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`active` : true');
    });

    it('should escape string values with quotes', () => {
      const filter: Filter = {
        meta: { key: 'message' },
        query: { match_phrase: { message: 'say "hello"' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`message` : "say \\"hello\\""');
    });

    it('should handle negated phrase filter', () => {
      const filter: Filter = {
        meta: { key: 'status', negate: true },
        query: { match_phrase: { status: 200 } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('NOT (`status` : 200)');
    });

    it('should handle deprecated match query format', () => {
      const filter: Filter = {
        meta: { key: 'status' },
        query: { match: { status: { query: 200, type: 'phrase' } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`status` : 200');
    });

    it('should return untranslatable for scripted phrase filter', () => {
      const filter: Filter = {
        meta: { key: 'scripted_field' },
        query: {
          script: {
            script: {
              source: 'doc["field"].value == params.value',
              lang: 'painless',
              params: { value: 'test' },
            },
          },
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toHaveLength(1);
    });
  });

  describe('phrases filter', () => {
    it('should translate a phrases filter with multiple values', () => {
      const filter: Filter = {
        meta: { type: 'phrases', key: 'machine.os', params: ['win xp', 'osx'] },
        query: {
          bool: {
            should: [
              { match_phrase: { 'machine.os': 'win xp' } },
              { match_phrase: { 'machine.os': 'osx' } },
            ],
            minimum_should_match: 1,
          },
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('(`machine.os` : "win xp" OR `machine.os` : "osx")');
    });

    it('should use : for single value phrases filter', () => {
      const filter: Filter = {
        meta: { type: 'phrases', key: 'status', params: [200] },
        query: {
          bool: {
            should: [{ match_phrase: { status: 200 } }],
            minimum_should_match: 1,
          },
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`status` : 200');
    });

    it('should handle negated phrases filter', () => {
      const filter: Filter = {
        meta: { type: 'phrases', key: 'machine.os', params: ['win xp', 'osx'], negate: true },
        query: {
          bool: {
            should: [
              { match_phrase: { 'machine.os': 'win xp' } },
              { match_phrase: { 'machine.os': 'osx' } },
            ],
            minimum_should_match: 1,
          },
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('NOT ((`machine.os` : "win xp" OR `machine.os` : "osx"))');
    });

    it('should return null for phrases filter with empty params', () => {
      const filter: Filter = {
        meta: { type: 'phrases', key: 'machine.os', params: [] },
        query: { bool: { should: [], minimum_should_match: 1 } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toHaveLength(1);
    });
  });

  describe('range filter', () => {
    it('should translate a range filter with gte and lt', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'bytes' },
        query: { range: { bytes: { gte: 100, lt: 1000 } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`bytes` >= 100 AND `bytes` < 1000');
    });

    it('should translate a range filter with gt only', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'bytes' },
        query: { range: { bytes: { gt: 0 } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`bytes` > 0');
    });

    it('should translate a range filter with lte only', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'bytes' },
        query: { range: { bytes: { lte: 500 } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`bytes` <= 500');
    });

    it('should coerce numeric string range values to numbers', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'day_of_week_i' },
        query: { range: { day_of_week_i: { gte: '1', lte: '5' } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`day_of_week_i` >= 1 AND `day_of_week_i` <= 5');
    });

    it('should translate a date range filter with string values', () => {
      const filter: Filter = {
        meta: { type: 'range', key: '@timestamp' },
        query: {
          range: {
            '@timestamp': { gte: '2024-01-01T00:00:00Z', lte: '2024-12-31T23:59:59Z' },
          },
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe(
        '`@timestamp` >= "2024-01-01T00:00:00Z" AND `@timestamp` <= "2024-12-31T23:59:59Z"'
      );
    });

    it('should handle negated range filter', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'bytes', negate: true },
        query: { range: { bytes: { gte: 100, lt: 1000 } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('NOT (`bytes` >= 100 AND `bytes` < 1000)');
    });

    it('should return untranslatable for scripted range filter', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'scripted_field' },
        query: {
          script: {
            script: {
              source: 'test',
              lang: 'painless',
              params: { gte: 0, lt: 100 },
            },
          },
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toHaveLength(1);
    });
  });

  describe('exists filter', () => {
    it('should translate an exists filter', () => {
      const filter: Filter = {
        meta: { key: 'host' },
        query: { exists: { field: 'host' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`host` IS NOT NULL');
    });

    it('should handle negated exists filter', () => {
      const filter: Filter = {
        meta: { key: 'host', negate: true },
        query: { exists: { field: 'host' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`host` IS NULL');
    });

    it('should handle field names with special characters', () => {
      const filter: Filter = {
        meta: { key: 'my.nested.field' },
        query: { exists: { field: 'my.nested.field' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('`my.nested.field` IS NOT NULL');
    });
  });

  describe('combined filter', () => {
    it('should translate an AND combined filter', () => {
      const filter: CombinedFilter = {
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.AND,
          params: [
            { meta: { key: 'status' }, query: { match_phrase: { status: 200 } } },
            { meta: { key: 'host' }, query: { exists: { field: 'host' } } },
          ],
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('(`status` : 200 AND `host` IS NOT NULL)');
    });

    it('should translate an OR combined filter', () => {
      const filter: CombinedFilter = {
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.OR,
          params: [
            { meta: { key: 'status' }, query: { match_phrase: { status: 200 } } },
            { meta: { key: 'status' }, query: { match_phrase: { status: 404 } } },
          ],
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('(`status` : 200 OR `status` : 404)');
    });

    it('should return untranslatable if any sub-filter is untranslatable', () => {
      const filter: CombinedFilter = {
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.AND,
          params: [
            { meta: { key: 'status' }, query: { match_phrase: { status: 200 } } },
            {
              meta: { key: 'custom' },
              query: { geo_distance: { distance: '200km', location: { lat: 0, lon: 0 } } },
            },
          ],
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toHaveLength(1);
    });

    it('should handle negated sub-filters within combined', () => {
      const filter: CombinedFilter = {
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.AND,
          params: [
            { meta: { key: 'status' }, query: { match_phrase: { status: 200 } } },
            { meta: { key: 'host', negate: true }, query: { exists: { field: 'host' } } },
          ],
        },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('(`status` : 200 AND `host` IS NULL)');
    });
  });

  describe('query_string filter', () => {
    it('should translate a query_string filter with QSTR', () => {
      const filter: Filter = {
        meta: { key: 'query' },
        query: { query_string: { query: 'status:error' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('QSTR("status:error")');
    });

    it('should handle negated query_string filter', () => {
      const filter: Filter = {
        meta: { key: 'query', negate: true },
        query: { query_string: { query: 'status:error' } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('NOT (QSTR("status:error"))');
    });
  });

  describe('untranslatable filters', () => {
    it('should return custom filters as untranslatable', () => {
      const filter: Filter = {
        meta: { type: 'custom', key: 'custom' },
        query: { bool: { must: [{ term: { status: 'error' } }] } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toEqual([filter]);
    });

    it('should return spatial filters as untranslatable', () => {
      const filter: Filter = {
        meta: { type: 'spatial_filter', key: 'location' },
        query: { geo_bounding_box: { location: { top_left: {}, bottom_right: {} } } },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toEqual([filter]);
    });
  });

  describe('multiple filters', () => {
    it('should join multiple translatable filters with AND', () => {
      const filters: Filter[] = [
        {
          meta: { key: 'status' },
          query: { match_phrase: { status: 200 } },
        },
        {
          meta: { key: 'host' },
          query: { exists: { field: 'host' } },
        },
        {
          meta: { type: 'range', key: 'bytes' },
          query: { range: { bytes: { gte: 100 } } },
        },
      ];
      const result = convertFiltersToESQLExpression(filters);
      expect(result.esqlExpression).toBe(
        '`status` : 200 AND `host` IS NOT NULL AND `bytes` >= 100'
      );
    });

    it('should handle mix of translatable and untranslatable filters', () => {
      const customFilter: Filter = {
        meta: { type: 'custom', key: 'custom' },
        query: { bool: { must: [] } },
      };
      const phraseFilter: Filter = {
        meta: { key: 'status' },
        query: { match_phrase: { status: 200 } },
      };
      const result = convertFiltersToESQLExpression([customFilter, phraseFilter]);
      expect(result.esqlExpression).toBe('`status` : 200');
      expect(result.untranslatableFilters).toEqual([customFilter]);
    });

    it('should skip disabled filters mixed with active ones', () => {
      const filters: Filter[] = [
        {
          meta: { key: 'status', disabled: true },
          query: { match_phrase: { status: 404 } },
        },
        {
          meta: { key: 'host' },
          query: { exists: { field: 'host' } },
        },
      ];
      const result = convertFiltersToESQLExpression(filters);
      expect(result.esqlExpression).toBe('`host` IS NOT NULL');
    });
  });

  describe('match_all filter', () => {
    it('should skip match_all filters (no expression)', () => {
      const filter: Filter = {
        meta: { type: 'match_all' },
        query: { match_all: {} },
      };
      const result = convertFiltersToESQLExpression([filter]);
      expect(result.esqlExpression).toBe('');
      expect(result.untranslatableFilters).toEqual([]);
    });
  });
});
