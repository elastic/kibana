/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  fromStoredFilter,
  convertToSimpleCondition,
  parseQueryFilter,
  extractFieldFromQuery,
} from './from_stored_filter';
import { FilterConversionError } from '../errors';
import { isConditionFilter, isGroupFilter, isDSLFilter } from './type_guards';
import type { Filter } from '@kbn/es-query-server';

describe('fromStoredFilter', () => {
  describe('main conversion function', () => {
    it('should convert simple phrase filters', () => {
      const storedFilter = {
        meta: {
          type: 'phrase',
          key: 'status',
          params: { query: 'active' },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'status',
          operator: 'is',
          value: 'active',
        });
      }
    });

    it('should convert match_phrase query filters', () => {
      const storedFilter = {
        meta: { key: 'message' },
        query: {
          match_phrase: {
            message: 'error occurred',
          },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isConditionFilter(result)).toBe(true);
      if (isConditionFilter(result)) {
        expect(result.condition).toEqual({
          field: 'message',
          operator: 'is',
          value: 'error occurred',
        });
      }
    });

    it('should convert boolean group filters', () => {
      const storedFilter = {
        meta: {},
        query: {
          bool: {
            must: [{ term: { status: 'active' } }, { term: { type: 'user' } }],
          },
        },
      };

      const result = fromStoredFilter(storedFilter);

      expect(isGroupFilter(result)).toBe(true);
      if (isGroupFilter(result)) {
        expect(result.group).toEqual({
          type: 'AND',
          conditions: expect.arrayContaining([
            expect.objectContaining({ field: 'status', operator: 'is', value: 'active' }),
            expect.objectContaining({ field: 'type', operator: 'is', value: 'user' }),
          ]),
        });
      }
    });

    it('should preserve complex filters as DSL', () => {
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

      const result = fromStoredFilter(storedFilter);

      expect(isDSLFilter(result)).toBe(true);
      if (isDSLFilter(result)) {
        expect(result.dsl).toEqual({
          query: storedFilter.query,
        });
      }
    });

    it('should extract base properties', () => {
      const storedFilter = {
        $state: { store: 'globalState' },
        meta: {
          key: 'status',
          disabled: true,
          alias: 'Status Filter',
          negate: true,
        },
        query: { term: { status: 'active' } },
      };

      const result = fromStoredFilter(storedFilter);

      expect(result.pinned).toBe(true);
      expect(result.disabled).toBe(true);
      expect(result.label).toBe('Status Filter');
      expect(result.negate).toBe(true);
    });

    it('should throw for null/undefined input', () => {
      expect(() => fromStoredFilter(null)).toThrow(FilterConversionError);
      expect(() => fromStoredFilter(undefined)).toThrow(FilterConversionError);
    });
  });

  describe('convertToSimpleCondition', () => {
    it('should convert exists queries', () => {
      const storedFilter = {
        meta: { key: 'field' },
        query: { exists: { field: 'test_field' } },
      } as Filter;

      const result = convertToSimpleCondition(storedFilter);

      expect(result).toEqual({
        field: 'field',
        operator: 'exists',
      });
    });

    it('should convert range queries', () => {
      const storedFilter = {
        meta: { key: 'age' },
        query: {
          range: {
            age: { gte: 18, lte: 65 },
          },
        },
      } as Filter;

      const result = convertToSimpleCondition(storedFilter);

      expect(result).toEqual({
        field: 'age',
        operator: 'range',
        value: { gte: 18, lte: 65 },
      });
    });

    it('should convert terms queries', () => {
      const storedFilter = {
        meta: { key: 'status' },
        query: {
          terms: {
            status: ['active', 'pending'],
          },
        },
      } as Filter;

      const result = convertToSimpleCondition(storedFilter);

      expect(result).toEqual({
        field: 'status',
        operator: 'is_one_of',
        value: ['active', 'pending'],
      });
    });

    it('should handle negated filters', () => {
      const storedFilter = {
        meta: { key: 'status', negate: true },
        query: { term: { status: 'inactive' } },
      } as Filter;

      const result = convertToSimpleCondition(storedFilter);

      expect(result).toEqual({
        field: 'status',
        operator: 'is_not',
        value: 'inactive',
      });
    });

    it('should extract field from query when missing from meta', () => {
      const storedFilter = {
        meta: {},
        query: { term: { username: 'john' } },
      } as Filter;

      const result = convertToSimpleCondition(storedFilter);

      expect(result.field).toBe('username');
    });

    it('should throw for unsupported query structures', () => {
      const storedFilter = {
        meta: { key: 'field' },
        query: { unsupported_query: { field: 'value' } },
      } as Filter;

      expect(() => convertToSimpleCondition(storedFilter)).toThrow(FilterConversionError);
    });
  });

  describe('parseQueryFilter', () => {
    it('should parse match_phrase queries', () => {
      const storedFilter = {
        meta: {},
        query: {
          match_phrase: {
            message: 'error occurred',
          },
        },
      } as Filter;

      const result = parseQueryFilter(storedFilter);

      expect(result).toEqual({
        field: 'message',
        operator: 'is',
        value: 'error occurred',
      });
    });

    it('should parse match_phrase queries with object values', () => {
      const storedFilter = {
        meta: {},
        query: {
          match_phrase: {
            message: { query: 'error occurred' },
          },
        },
      } as Filter;

      const result = parseQueryFilter(storedFilter);

      expect(result).toEqual({
        field: 'message',
        operator: 'is',
        value: 'error occurred',
      });
    });

    it('should parse match queries with phrase type', () => {
      const storedFilter = {
        meta: {},
        query: {
          match: {
            message: {
              type: 'phrase',
              query: 'test message',
            },
          },
        },
      } as Filter;

      const result = parseQueryFilter(storedFilter);

      expect(result).toEqual({
        field: 'message',
        operator: 'is',
        value: 'test message',
      });
    });
  });

  describe('extractFieldFromQuery', () => {
    it('should extract field from term queries', () => {
      const query = { term: { status: 'active' } };
      expect(extractFieldFromQuery(query)).toBe('status');
    });

    it('should extract field from terms queries', () => {
      const query = { terms: { tags: ['urgent', 'bug'] } };
      expect(extractFieldFromQuery(query)).toBe('tags');
    });

    it('should extract field from range queries', () => {
      const query = { range: { age: { gte: 18 } } };
      expect(extractFieldFromQuery(query)).toBe('age');
    });

    it('should extract field from exists queries', () => {
      const query = { exists: { field: 'username' } };
      expect(extractFieldFromQuery(query)).toBe('username');
    });

    it('should extract field from match queries', () => {
      const query = { match: { message: 'error' } };
      expect(extractFieldFromQuery(query)).toBe('message');
    });

    it('should return null for unsupported queries', () => {
      const query = { script: { source: 'doc.field.value > 0' } };
      expect(extractFieldFromQuery(query)).toBe(null);
    });
  });
});
