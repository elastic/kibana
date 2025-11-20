/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isConditionFilter, isGroupFilter, isDSLFilter, isNestedFilterGroup } from './type_guards';

describe('Type Guards', () => {
  describe('SimpleFilter type guards', () => {
    describe('isConditionFilter', () => {
      it('should detect condition filters', () => {
        const filter = {
          condition: { field: 'test', operator: 'is', value: 'value' },
        };
        expect(isConditionFilter(filter as any)).toBe(true);
      });

      it('should reject non-condition filters', () => {
        const filter = {
          group: { type: 'and', conditions: [] },
        };
        expect(isConditionFilter(filter as any)).toBe(false);
      });
    });

    describe('isGroupFilter', () => {
      it('should detect group filters', () => {
        const filter = {
          group: { type: 'and', conditions: [] },
        };
        expect(isGroupFilter(filter as any)).toBe(true);
      });

      it('should reject non-group filters', () => {
        const filter = {
          condition: { field: 'test', operator: 'is', value: 'value' },
        };
        expect(isGroupFilter(filter as any)).toBe(false);
      });
    });

    describe('isDSLFilter', () => {
      it('should detect DSL filters', () => {
        const filter = {
          dsl: { query: { term: { field: 'value' } } },
        };
        expect(isDSLFilter(filter as any)).toBe(true);
      });

      it('should reject non-DSL filters', () => {
        const filter = {
          condition: { field: 'test', operator: 'is', value: 'value' },
        };
        expect(isDSLFilter(filter as any)).toBe(false);
      });
    });
  });

  describe('Condition type guards', () => {
    describe('isNestedFilterGroup', () => {
      it('should detect nested filter groups', () => {
        const group = {
          type: 'and',
          conditions: [{ field: 'test', operator: 'is', value: 'test' }],
        };
        expect(isNestedFilterGroup(group as any)).toBe(true);
      });

      it('should reject simple conditions', () => {
        const condition = { field: 'test', operator: 'is', value: 'test' };
        expect(isNestedFilterGroup(condition as any)).toBe(false);
      });
    });
  });
});
