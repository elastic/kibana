/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isFullyCompatible,
  isEnhancedCompatible,
  isStoredGroupFilter,
  isConditionFilter,
  isGroupFilter,
  isDSLFilter,
  isConditionWithValue,
  isExistenceCondition,
  isNestedFilterGroup,
} from './type_guards';

describe('Type Guards', () => {
  describe('isFullyCompatible', () => {
    it('should detect simple phrase filters', () => {
      const filter = {
        meta: { type: 'phrase', params: { query: 'test' } },
      };
      expect(isFullyCompatible(filter)).toBe(true);
    });

    it('should detect exists filters', () => {
      const filter = {
        meta: { type: 'exists' },
      };
      expect(isFullyCompatible(filter)).toBe(true);
    });

    it('should detect range filters', () => {
      const filter = {
        meta: { type: 'range', params: { gte: 10, lte: 20 } },
      };
      expect(isFullyCompatible(filter)).toBe(true);
    });

    it('should accept phrase filters with query properties', () => {
      const filter = {
        meta: { type: 'phrase', params: { query: 'test' } },
        query: { match_phrase: { field: 'test' } },
      };
      expect(isFullyCompatible(filter)).toBe(true);
    });

    it('should reject filters without meta', () => {
      const filter = { query: { match_phrase: { field: 'test' } } };
      expect(isFullyCompatible(filter)).toBe(false);
    });
  });
  describe('isEnhancedCompatible', () => {
    it('should detect match_phrase queries', () => {
      const filter = {
        query: { match_phrase: { field: 'test value' } },
      };
      expect(isEnhancedCompatible(filter)).toBe(true);
    });

    it('should detect range queries', () => {
      const filter = {
        query: { range: { field: { gte: 10, lte: 20 } } },
      };
      expect(isEnhancedCompatible(filter)).toBe(true);
    });

    it('should detect exists queries', () => {
      const filter = {
        query: { exists: { field: 'test_field' } },
      };
      expect(isEnhancedCompatible(filter)).toBe(true);
    });

    it('should detect legacy range filters', () => {
      const filter = {
        range: { field: { gte: 10, lte: 20 } },
      };
      expect(isEnhancedCompatible(filter)).toBe(true);
    });

    it('should reject unsupported query types', () => {
      const filter = {
        query: { script: { source: 'doc.field.value > 0' } },
      };
      expect(isEnhancedCompatible(filter)).toBe(false);
    });
  });

  describe('isStoredGroupFilter', () => {
    it('should detect bool query with multiple must conditions', () => {
      const filter = {
        query: {
          bool: {
            must: [{ term: { field1: 'value1' } }, { term: { field2: 'value2' } }],
          },
        },
      };
      expect(isStoredGroupFilter(filter)).toBe(true);
    });

    it('should detect bool query with multiple should conditions', () => {
      const filter = {
        query: {
          bool: {
            should: [{ term: { field1: 'value1' } }, { term: { field2: 'value2' } }],
          },
        },
      };
      expect(isStoredGroupFilter(filter)).toBe(true);
    });

    it('should reject single condition bool queries', () => {
      const filter = {
        query: {
          bool: {
            must: [{ term: { field: 'value' } }],
          },
        },
      };
      expect(isStoredGroupFilter(filter)).toBe(false);
    });

    it('should reject non-bool queries', () => {
      const filter = {
        query: { term: { field: 'value' } },
      };
      expect(isStoredGroupFilter(filter)).toBe(false);
    });
  });

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
    describe('isConditionWithValue', () => {
      it('should detect conditions that require values', () => {
        const condition = { field: 'test', operator: 'is', value: 'test' };
        expect(isConditionWithValue(condition as any)).toBe(true);
      });

      it('should reject existence conditions', () => {
        const condition = { field: 'test', operator: 'exists' };
        expect(isConditionWithValue(condition as any)).toBe(false);
      });
    });

    describe('isExistenceCondition', () => {
      it('should detect exists conditions', () => {
        const condition = { field: 'test', operator: 'exists' };
        expect(isExistenceCondition(condition as any)).toBe(true);
      });

      it('should detect not_exists conditions', () => {
        const condition = { field: 'test', operator: 'not_exists' };
        expect(isExistenceCondition(condition as any)).toBe(true);
      });

      it('should reject value conditions', () => {
        const condition = { field: 'test', operator: 'is', value: 'test' };
        expect(isExistenceCondition(condition as any)).toBe(false);
      });
    });

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
