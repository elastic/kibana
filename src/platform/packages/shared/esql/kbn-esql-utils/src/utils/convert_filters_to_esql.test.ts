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
import {
  convertEsqlFiltersToESQLExpression,
  convertFiltersToESQLExpression,
} from './convert_filters_to_esql';

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

describe('ES|QL filters', () => {
  const esqlFilter: Filter = {
    meta: { kind: 'esql', key: 'size', type: FILTERS.PHRASE, params: { query: 'big' } },
    query: { match_phrase: { size: 'big' } },
  };
  const getPhrases = (params: unknown, meta: Partial<Filter['meta']> = {}): Filter => ({
    meta: { kind: 'esql', key: 'size', type: FILTERS.PHRASES, params, ...meta } as Filter['meta'],
    query: {},
  });
  const regularFilter: Filter = {
    meta: { key: 'host', type: FILTERS.PHRASE, params: { query: 'a' } },
    query: { match_phrase: { host: 'a' } },
  };

  it('are not translated for the WHERE after the source command, as the column does not exist there', () => {
    expect(convertFiltersToESQLExpression([regularFilter, esqlFilter])).toEqual({
      esqlExpression: '`host` : "a"',
      untranslatableFilters: [esqlFilter],
    });
  });

  describe('convertEsqlFiltersToESQLExpression', () => {
    it('does not use the match operator, which does not work on columns that a query creates', () => {
      expect(convertEsqlFiltersToESQLExpression([esqlFilter])).toBe('`size` == "big"');
    });

    it('writes an integer that is too big to be exact as a double, and the others as they are', () => {
      const getPhraseOf = (value: number): Filter => ({
        ...esqlFilter,
        meta: { ...esqlFilter.meta, params: { query: value } },
        query: { match_phrase: { size: value } },
      });

      // an integer literal that does not fit in a long is an unsigned_long, that a double column does not compare with
      expect(convertEsqlFiltersToESQLExpression([getPhraseOf(2 ** 63)])).toBe(
        '`size` == 9223372036854776000.0'
      );
      expect(convertEsqlFiltersToESQLExpression([getPhraseOf(5)])).toBe('`size` == 5');
      expect(convertEsqlFiltersToESQLExpression([getPhraseOf(2.5)])).toBe('`size` == 2.5');
    });

    describe('several values', () => {
      it('checks them with MV_INTERSECTS, as an operator like IN evaluates to null on a multivalued column', () => {
        expect(convertEsqlFiltersToESQLExpression([getPhrases(['a', 'b'])])).toBe(
          'MV_INTERSECTS(TO_STRING(`size`), ["a", "b"])'
        );
      });

      it('matches any of the values, like the phrases filters of DSL, and not all of them', () => {
        const expression = convertEsqlFiltersToESQLExpression([getPhrases(['a', 'b'])]);

        // MV_CONTAINS would need all of them, so a column that has only one of them would not match
        expect(expression).toContain('MV_INTERSECTS');
        expect(expression).not.toContain('MV_CONTAINS');
      });

      it('does not grow with the number of values, as Elasticsearch rejects an expression with too many parentheses', () => {
        const values = Array.from({ length: 10000 }, (_, index) => `value-${index}`);
        const expression = convertEsqlFiltersToESQLExpression([getPhrases(values)]);

        expect(expression.match(/\(/g)).toHaveLength(2);
        expect(expression).toContain('"value-9999"');
      });

      it('compares the numbers as doubles, as MV_INTERSECTS needs the same type and the one of the column is not known', () => {
        expect(convertEsqlFiltersToESQLExpression([getPhrases([1, 2.5])])).toBe(
          'MV_INTERSECTS(TO_DOUBLE(`size`), [1.0, 2.5])'
        );
      });

      it('writes every number as a double literal, as a big integer would make the array an unsigned_long one that does not accept a negative number', () => {
        // 2 ** 63 does not fit in a long, so without a decimal point ES|QL takes it as an unsigned_long
        expect(convertEsqlFiltersToESQLExpression([getPhrases([-1, 2 ** 63])])).toBe(
          'MV_INTERSECTS(TO_DOUBLE(`size`), [-1.0, 9223372036854776000.0])'
        );
        expect(convertEsqlFiltersToESQLExpression([getPhrases([1e21, 1.5e-7, 0])])).toBe(
          'MV_INTERSECTS(TO_DOUBLE(`size`), [1e+21, 1.5e-7, 0.0])'
        );
      });

      it('compares the booleans as they are', () => {
        expect(convertEsqlFiltersToESQLExpression([getPhrases([true, false])])).toBe(
          'MV_INTERSECTS(`size`, [true, false])'
        );
      });

      it('has a check for each type of value, as an array of ES|QL has one type', () => {
        expect(convertEsqlFiltersToESQLExpression([getPhrases(['a', 1, false, 'b'])])).toBe(
          '(MV_INTERSECTS(TO_STRING(`size`), ["a", "b"]) OR MV_INTERSECTS(TO_DOUBLE(`size`), [1.0]) OR MV_INTERSECTS(`size`, [false]))'
        );
      });
    });

    it('keeps the rows without a value when negating, as a negated DSL filter keeps the documents without the field', () => {
      expect(
        convertEsqlFiltersToESQLExpression([
          { ...esqlFilter, meta: { ...esqlFilter.meta, negate: true } },
        ])
      ).toBe('(`size` IS NULL OR NOT (`size` == "big"))');
      expect(convertEsqlFiltersToESQLExpression([getPhrases(['a', 'b'], { negate: true })])).toBe(
        '(`size` IS NULL OR NOT (MV_INTERSECTS(TO_STRING(`size`), ["a", "b"])))'
      );
    });

    it('translates exists filters', () => {
      const exists = {
        meta: { kind: 'esql' as const, type: FILTERS.EXISTS, key: 'size' },
        query: { exists: { field: 'size' } },
      };

      expect(convertEsqlFiltersToESQLExpression([exists])).toBe('`size` IS NOT NULL');
      expect(
        convertEsqlFiltersToESQLExpression([{ ...exists, meta: { ...exists.meta, negate: true } }])
      ).toBe('`size` IS NULL');
    });

    it('joins several filters with AND', () => {
      expect(
        convertEsqlFiltersToESQLExpression([
          esqlFilter,
          {
            ...esqlFilter,
            meta: { ...esqlFilter.meta, key: 'c' },
            query: { match_phrase: { c: 3 } },
          },
        ])
      ).toBe('`size` == "big" AND `c` == 3');
    });

    it('ignores the disabled filters and the ones that are not ES|QL ones', () => {
      expect(
        convertEsqlFiltersToESQLExpression([
          regularFilter,
          { ...esqlFilter, meta: { ...esqlFilter.meta, disabled: true } },
        ])
      ).toBe('');
    });

    describe('values that are not literals', () => {
      // The values come from the URL or a saved object and they are written into the query,
      // so anything but a string, a finite number or a boolean must not be written
      const injection = '1) | KEEP secret_field | WHERE (1';

      it.each([
        ['an array in a list of values', getPhrases([[injection]])],
        ['an object in a list of values', getPhrases([{ a: 1 }])],
        ['null in a list of values', getPhrases([null])],
        ['NaN in a list of values', getPhrases([NaN])],
        [
          'an array as the value',
          { ...esqlFilter, query: { match_phrase: { size: [injection] } } },
        ],
        ['an object as the value', { ...esqlFilter, query: { match_phrase: { size: { a: 1 } } } }],
        ['Infinity as the value', { ...esqlFilter, query: { match_phrase: { size: Infinity } } }],
      ])('does not translate %s', (_, filter) => {
        expect(convertEsqlFiltersToESQLExpression([filter])).toBe('');
      });

      it('escapes the strings', () => {
        expect(
          convertEsqlFiltersToESQLExpression([
            { ...esqlFilter, query: { match_phrase: { size: 'a"b | KEEP x' } } },
          ])
        ).toBe('`size` == "a\\"b | KEEP x"');
      });

      it('does not translate them with the match operator either', () => {
        // not an ES|QL filter, so it is translated with the match operator
        const matchPhrases = getPhrases([[injection]], { kind: undefined });

        expect(convertFiltersToESQLExpression([matchPhrases])).toEqual({
          esqlExpression: '',
          untranslatableFilters: [matchPhrases],
        });
      });
    });
  });
});
