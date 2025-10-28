/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SimplifiedFilter,
  SimpleFilterCondition,
  Filter as StoredFilter,
} from '@kbn/es-query-server';
import {
  toStoredFilter,
  convertFromSimpleCondition,
  convertFromFilterGroup,
  convertFromDSLFilter,
} from './to_stored_filter';
import { FilterStateStore } from '../../..';
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
        match_phrase: {
          status: 'active',
        },
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

      // AND groups use combined filter format
      expect(result.meta.type).toBe('combined');
      expect(result.meta.relation).toBe('AND');
      expect(Array.isArray(result.meta.params)).toBe(true);
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
    const createBaseStored = (): StoredFilter => ({
      $state: { store: FilterStateStore.APP_STATE },
      meta: { alias: null, disabled: false, negate: false },
      query: {}, // Will be overridden by the conversion function
    });

    it('should convert exists conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'username',
        operator: 'exists',
      };

      const result = convertFromSimpleCondition(condition, createBaseStored());

      expect(result.query).toEqual({ exists: { field: 'username' } });
      expect(result.meta.type).toBe('exists');
    });

    it('should convert not_exists conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'username',
        operator: 'not_exists',
      };

      const result = convertFromSimpleCondition(condition, createBaseStored());

      expect(result.query).toEqual({ exists: { field: 'username' } });
      expect(result.meta.negate).toBe(true);
    });

    it('should convert is conditions', () => {
      const condition: SimpleFilterCondition = {
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
      const condition: SimpleFilterCondition = {
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
        type: 'AND' as const,
        conditions: [
          { field: 'status', operator: 'is', value: 'active' } as SimpleFilterCondition,
          { field: 'type', operator: 'is', value: 'user' } as SimpleFilterCondition,
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
        type: 'OR' as const,
        conditions: [
          { field: 'status', operator: 'is', value: 'active' } as SimpleFilterCondition,
          { field: 'status', operator: 'is', value: 'pending' } as SimpleFilterCondition,
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
  });
});
