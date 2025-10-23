/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SimplifiedFilter, SimpleFilterCondition } from '@kbn/es-query-server';
import {
  toStoredFilter,
  convertFromSimpleCondition,
  convertFromFilterGroup,
  convertFromDSLFilter,
} from './to_stored_filter';
import { FilterConversionError } from '../errors';

describe('toStoredFilter', () => {
  describe('main conversion function', () => {
    it('should convert condition filters to stored format', () => {
      const simplified: SimplifiedFilter = {
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
        term: { status: 'active' },
      });
    });

    it('should handle pinned filters', () => {
      const simplified: SimplifiedFilter = {
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
      const simplified: SimplifiedFilter = {
        group: {
          type: 'AND',
          conditions: [
            { field: 'status', operator: 'is', value: 'active' },
            { field: 'type', operator: 'is', value: 'user' },
          ],
        },
      };

      const result = toStoredFilter(simplified);

      expect(result.query).toEqual({
        bool: {
          must: [{ term: { status: 'active' } }, { term: { type: 'user' } }],
        },
      });
    });

    it('should convert DSL filters', () => {
      const simplified: SimplifiedFilter = {
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
      const simplified = {} as SimplifiedFilter;

      expect(() => toStoredFilter(simplified)).toThrow(FilterConversionError);
    });
  });

  describe('convertFromSimpleCondition', () => {
    const baseStored = {
      $state: { store: 'appState' },
      meta: { alias: null, disabled: false, negate: false },
    };

    it('should convert exists conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'username',
        operator: 'exists',
      };

      const result = convertFromSimpleCondition(condition, baseStored as any);

      expect(result.query).toEqual({ exists: { field: 'username' } });
      expect(result.meta.type).toBe('exists');
    });

    it('should convert not_exists conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'username',
        operator: 'not_exists',
      };

      const result = convertFromSimpleCondition(condition, baseStored as any);

      expect(result.query).toEqual({ exists: { field: 'username' } });
      expect(result.meta.negate).toBe(true);
    });

    it('should convert is conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'status',
        operator: 'is',
        value: 'active',
      };

      const result = convertFromSimpleCondition(condition, baseStored as any);

      expect(result.query).toEqual({ term: { status: 'active' } });
      expect(result.meta.params).toEqual({ query: 'active' });
    });

    it('should convert is_not conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'status',
        operator: 'is_not',
        value: 'inactive',
      };

      const result = convertFromSimpleCondition(condition, baseStored as any);

      expect(result.query).toEqual({ term: { status: 'inactive' } });
      expect(result.meta.negate).toBe(true);
    });

    it('should convert is_one_of conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'tags',
        operator: 'is_one_of',
        value: ['urgent', 'bug'],
      };

      const result = convertFromSimpleCondition(condition, baseStored as any);

      expect(result.query).toEqual({ terms: { tags: ['urgent', 'bug'] } });
      expect(result.meta.params).toEqual({ terms: ['urgent', 'bug'] });
    });

    it('should convert range conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'age',
        operator: 'range',
        value: { gte: 18, lte: 65 },
      };

      const result = convertFromSimpleCondition(condition, baseStored as any);

      expect(result.query).toEqual({ range: { age: { gte: 18, lte: 65 } } });
      expect(result.meta.params).toEqual({ gte: 18, lte: 65 });
    });
  });

  describe('convertFromFilterGroup', () => {
    const baseStored = {
      $state: { store: 'appState' },
      meta: { alias: null, disabled: false, negate: false },
    };

    it('should convert AND groups to must queries', () => {
      const group = {
        type: 'AND' as const,
        conditions: [
          { field: 'status', operator: 'is', value: 'active' } as SimpleFilterCondition,
          { field: 'type', operator: 'is', value: 'user' } as SimpleFilterCondition,
        ],
      };

      const result = convertFromFilterGroup(group, baseStored as any);

      expect(result.query).toEqual({
        bool: {
          must: [{ term: { status: 'active' } }, { term: { type: 'user' } }],
        },
      });
    });

    it('should convert OR groups to should queries', () => {
      const group = {
        type: 'OR' as const,
        conditions: [
          { field: 'status', operator: 'is', value: 'active' } as SimpleFilterCondition,
          { field: 'status', operator: 'is', value: 'pending' } as SimpleFilterCondition,
        ],
      };

      const result = convertFromFilterGroup(group, baseStored as any);

      expect(result.query).toEqual({
        bool: {
          should: [{ term: { status: 'active' } }, { term: { status: 'pending' } }],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('convertFromDSLFilter', () => {
    const baseStored = {
      $state: { store: 'appState' },
      meta: { alias: null, disabled: false, negate: false },
    };

    it('should convert DSL filters to stored format', () => {
      const dsl = {
        query: { script: { source: 'doc.field.value > 0' } },
      };

      const result = convertFromDSLFilter(dsl, baseStored as any);

      expect(result.query).toEqual(dsl.query);
      expect(result.meta.type).toBe('custom');
    });
  });
});
