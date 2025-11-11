/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SimplifiedFilter, SimpleFilterCondition, FilterGroup } from '@kbn/es-query-server';
import {
  validate,
  validateSimplifiedFilter,
  validateSimpleCondition,
  validateFilterGroup,
  validateDSLFilter,
} from './validation';
import { FilterConversionError } from '../errors';

describe('Validation', () => {
  describe('validate', () => {
    it('should validate a correct condition filter', () => {
      const filter: SimplifiedFilter = {
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      };

      const result = validate(filter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a correct group filter', () => {
      const filter: SimplifiedFilter = {
        group: {
          type: 'AND',
          conditions: [
            { field: 'status', operator: 'is', value: 'active' },
            { field: 'type', operator: 'is', value: 'user' },
          ],
        },
      };

      const result = validate(filter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a correct DSL filter', () => {
      const filter: SimplifiedFilter = {
        dsl: {
          query: { term: { field: 'value' } },
        },
      };

      const result = validate(filter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject filters with no type', () => {
      const filter = {} as SimplifiedFilter;

      const result = validate(filter);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_FILTER_TYPE');
    });

    it('should reject filters with multiple types', () => {
      const filter = {
        condition: { field: 'test', operator: 'is', value: 'test' },
        group: { type: 'AND', conditions: [{ field: 'test2', operator: 'is', value: 'test2' }] },
      } as any;

      const result = validate(filter);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.code === 'MULTIPLE_FILTER_TYPES')).toBe(true);
    });

    it('should add warnings for potentially problematic configurations', () => {
      const filter: SimplifiedFilter = {
        disabled: true,
        pinned: true,
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      };

      const result = validate(filter);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Pinned filters are typically not disabled');
    });
  });

  describe('validateSimplifiedFilter', () => {
    it('should pass valid filters silently', () => {
      const filter: SimplifiedFilter = {
        condition: {
          field: 'status',
          operator: 'is',
          value: 'active',
        },
      };

      expect(() => validateSimplifiedFilter(filter)).not.toThrow();
    });

    it('should throw for invalid filters', () => {
      const filter = {} as SimplifiedFilter;

      expect(() => validateSimplifiedFilter(filter)).toThrow(FilterConversionError);
      expect(() => validateSimplifiedFilter(filter)).toThrow(
        'Filter must have exactly one of: condition, group, or dsl'
      );
    });
  });

  describe('validateSimpleCondition', () => {
    it('should validate correct simple conditions', () => {
      const condition: SimpleFilterCondition = {
        field: 'status',
        operator: 'is',
        value: 'active',
      };
      const errors: any[] = [];

      validateSimpleCondition(condition, errors);

      expect(errors).toHaveLength(0);
    });

    it('should reject conditions with empty field names', () => {
      const condition: SimpleFilterCondition = {
        field: '',
        operator: 'is',
        value: 'active',
      };
      const errors: any[] = [];

      validateSimpleCondition(condition, errors);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_FIELD');
    });

    it('should reject existence conditions with values', () => {
      const condition = {
        field: 'status',
        operator: 'exists',
        value: 'should_not_have_value',
      } as any;
      const errors: any[] = [];

      validateSimpleCondition(condition, errors);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('UNEXPECTED_VALUE');
    });

    it('should reject value conditions without values', () => {
      const condition = {
        field: 'status',
        operator: 'is',
        // missing value
      } as any;
      const errors: any[] = [];

      validateSimpleCondition(condition, errors);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MISSING_VALUE');
    });

    it('should allow existence conditions without values', () => {
      const condition: SimpleFilterCondition = {
        field: 'status',
        operator: 'exists',
      };
      const errors: any[] = [];

      validateSimpleCondition(condition, errors);

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateFilterGroup', () => {
    it('should validate correct filter groups', () => {
      const group: FilterGroup = {
        type: 'AND',
        conditions: [
          { field: 'status', operator: 'is', value: 'active' },
          { field: 'type', operator: 'is', value: 'user' },
        ],
      };
      const errors: any[] = [];

      validateFilterGroup(group, errors);

      expect(errors).toHaveLength(0);
    });

    it('should reject empty filter groups', () => {
      const group: FilterGroup = {
        type: 'AND',
        conditions: [],
      };
      const errors: any[] = [];

      validateFilterGroup(group, errors);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('EMPTY_GROUP');
    });

    it('should recursively validate nested conditions', () => {
      const group: FilterGroup = {
        type: 'AND',
        conditions: [
          { field: '', operator: 'is', value: 'active' }, // Invalid field
          { field: 'type', operator: 'exists', value: 'should_not_have' }, // Invalid value for exists
        ],
      };
      const errors: any[] = [];

      validateFilterGroup(group, errors);

      expect(errors).toHaveLength(2);
      expect(errors[0].code).toBe('INVALID_FIELD');
      expect(errors[1].code).toBe('UNEXPECTED_VALUE');
    });
  });

  describe('validateDSLFilter', () => {
    it('should validate correct DSL filters', () => {
      const dsl = {
        query: { term: { field: 'value' } },
      };
      const errors: any[] = [];

      validateDSLFilter(dsl, errors);

      expect(errors).toHaveLength(0);
    });

    it('should reject DSL filters without query', () => {
      const dsl = {} as any;
      const errors: any[] = [];

      validateDSLFilter(dsl, errors);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_DSL');
    });

    it('should reject DSL filters with non-object query', () => {
      const dsl = {
        query: 'invalid_query',
      } as any;
      const errors: any[] = [];

      validateDSLFilter(dsl, errors);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_DSL');
    });
  });
});
