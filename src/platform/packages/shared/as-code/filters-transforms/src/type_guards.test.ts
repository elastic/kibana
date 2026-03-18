/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AsCodeConditionFilter,
  AsCodeGroupFilter,
  AsCodeDSLFilter,
} from '@kbn/as-code-filters-schema';
import { isConditionFilter, isGroupFilter, isDSLFilter, isGroupCondition } from './type_guards';

describe('Type Guards', () => {
  describe('SimpleFilter type guards', () => {
    describe('isConditionFilter', () => {
      it('should detect condition filters', () => {
        const filter: AsCodeConditionFilter = {
          type: 'condition',
          condition: { field: 'test', operator: 'is', value: 'value' },
        };
        expect(isConditionFilter(filter)).toBe(true);
      });

      it('should reject non-condition filters', () => {
        const filter: AsCodeGroupFilter = {
          type: 'group',
          group: { operator: 'and', conditions: [] },
        };
        expect(isConditionFilter(filter)).toBe(false);
      });
    });

    describe('isGroupFilter', () => {
      it('should detect group filters', () => {
        const filter: AsCodeGroupFilter = {
          type: 'group',
          group: { operator: 'and', conditions: [] },
        };
        expect(isGroupFilter(filter)).toBe(true);
      });

      it('should reject non-group filters', () => {
        const filter: AsCodeConditionFilter = {
          type: 'condition',
          condition: { field: 'test', operator: 'is', value: 'value' },
        };
        expect(isGroupFilter(filter)).toBe(false);
      });
    });

    describe('isDSLFilter', () => {
      it('should detect DSL filters', () => {
        const filter: AsCodeDSLFilter = {
          type: 'dsl',
          dsl: { query: { term: { field: 'value' } } },
        };
        expect(isDSLFilter(filter)).toBe(true);
      });

      it('should reject non-DSL filters', () => {
        const filter: AsCodeConditionFilter = {
          type: 'condition',
          condition: { field: 'test', operator: 'is', value: 'value' },
        };
        expect(isDSLFilter(filter)).toBe(false);
      });
    });
  });

  describe('Condition type guards', () => {
    describe('isGroupCondition', () => {
      it('should detect nested filter groups', () => {
        const group: AsCodeGroupFilter['group'] = {
          operator: 'and',
          conditions: [{ field: 'test', operator: 'is', value: 'test' }],
        };
        expect(isGroupCondition(group)).toBe(true);
      });

      it('should reject simple conditions', () => {
        const condition: AsCodeConditionFilter['condition'] = {
          field: 'test',
          operator: 'is',
          value: 'test',
        };
        expect(isGroupCondition(condition)).toBe(false);
      });
    });
  });
});
