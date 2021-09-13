/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  existsFilter,
  phraseFilter,
  phrasesFilter,
  rangeFilter,
  stubIndexPattern,
  stubFields,
} from '../../../../stubs';
import { toggleFilterNegated } from '../../../../../common';
import {
  getFieldFromFilter,
  getFilterableFields,
  getOperatorFromFilter,
  getOperatorOptions,
  isPhraseFilterValid,
  isPhrasesFilterValid,
  isRangeFilterValid,
  isExistsFilterValid,
} from './filter_editor_utils';

describe('Filter editor utils', () => {
  describe('getFieldFromFilter', () => {
    it('should return the field from the filter', () => {
      const field = getFieldFromFilter(phraseFilter, stubIndexPattern);
      expect(field).not.toBeUndefined();
      expect(field && field.name).toBe(phraseFilter.meta.key);
    });
  });

  describe('getOperatorFromFilter', () => {
    it('should return "is" for phrase filter', () => {
      const operator = getOperatorFromFilter(phraseFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('phrase');
      expect(operator && operator.negate).toBe(false);
    });

    it('should return "is not" for phrase filter', () => {
      const negatedPhraseFilter = toggleFilterNegated(phraseFilter);
      const operator = getOperatorFromFilter(negatedPhraseFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('phrase');
      expect(operator && operator.negate).toBe(true);
    });

    it('should return "is one of" for phrases filter', () => {
      const operator = getOperatorFromFilter(phrasesFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('phrases');
      expect(operator && operator.negate).toBe(false);
    });

    it('should return "is not one of" for negated phrases filter', () => {
      const negatedPhrasesFilter = toggleFilterNegated(phrasesFilter);
      const operator = getOperatorFromFilter(negatedPhrasesFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('phrases');
      expect(operator && operator.negate).toBe(true);
    });

    it('should return "is between" for range filter', () => {
      const operator = getOperatorFromFilter(rangeFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('range');
      expect(operator && operator.negate).toBe(false);
    });

    it('should return "is not between" for negated range filter', () => {
      const negatedRangeFilter = toggleFilterNegated(rangeFilter);
      const operator = getOperatorFromFilter(negatedRangeFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('range');
      expect(operator && operator.negate).toBe(true);
    });

    it('should return "exists" for exists filter', () => {
      const operator = getOperatorFromFilter(existsFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('exists');
      expect(operator && operator.negate).toBe(false);
    });

    it('should return "does not exists" for negated exists filter', () => {
      const negatedExistsFilter = toggleFilterNegated(existsFilter);
      const operator = getOperatorFromFilter(negatedExistsFilter);
      expect(operator).not.toBeUndefined();
      expect(operator && operator.type).toBe('exists');
      expect(operator && operator.negate).toBe(true);
    });
  });

  describe('getFilterableFields', () => {
    it('returns the list of fields from the given index pattern', () => {
      const fieldOptions = getFilterableFields(stubIndexPattern);
      expect(fieldOptions.length).toBeGreaterThan(0);
    });

    it('limits the fields to the filterable fields', () => {
      const fieldOptions = getFilterableFields(stubIndexPattern);
      const nonFilterableFields = fieldOptions.filter((field) => !field.filterable);
      expect(nonFilterableFields.length).toBe(0);
    });
  });

  describe('getOperatorOptions', () => {
    it('returns range for number fields', () => {
      const [field] = stubFields.filter(({ type }) => type === 'number');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find((operator) => operator.type === 'range');
      expect(rangeOperator).not.toBeUndefined();
    });

    it('does not return range for string fields', () => {
      const [field] = stubFields.filter(({ type }) => type === 'string');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find((operator) => operator.type === 'range');
      expect(rangeOperator).toBeUndefined();
    });

    it('does not return phrase for number_range fields', () => {
      const [field] = stubFields.filter(({ type }) => type === 'string');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find((operator) => operator.type === 'range');
      expect(rangeOperator).toBeUndefined();
    });
  });

  describe('isExistsFilterValid', () => {
    it('should return false if index pattern is not provided', () => {
      const isValid = isExistsFilterValid(undefined, stubFields[0]);
      expect(isValid).toBe(false);
    });

    it('should return false if field is not provided', () => {
      const isValid = isExistsFilterValid(stubIndexPattern, undefined);
      expect(isValid).toBe(false);
    });

    it('should return true if index pattern and field are provided', () => {
      const isValid = isExistsFilterValid(stubIndexPattern, stubFields[0]);
      expect(isValid).toBe(true);
    });
  });

  describe('isPhraseFilterValid', () => {
    it('should return false for phrase filter invalid params', () => {
      const isValid = isPhraseFilterValid(stubIndexPattern, stubFields[4], 'foo');
      expect(isValid).toBe(false);
    });

    it('should return true for phrases filter valid params', () => {
      const isValid = isPhraseFilterValid(stubIndexPattern, stubFields[4], 'now');
      expect(isValid).toBe(true);
    });
  });

  describe('isPhrasesFilterValid', () => {
    it('should return false for phrases filter without phrases', () => {
      const isValid = isPhrasesFilterValid(stubIndexPattern, stubFields[0], []);
      expect(isValid).toBe(false);
    });

    it('should return true for phrases filter with phrases', () => {
      const isValid = isPhrasesFilterValid(stubIndexPattern, stubFields[0], ['foo']);
      expect(isValid).toBe(true);
    });
  });

  describe('isRangeFilterValid', () => {
    it('should return false for range filter without range', () => {
      const isValid = isRangeFilterValid(stubIndexPattern, stubFields[0], undefined);
      expect(isValid).toBe(false);
    });

    it('should return true for range filter with from', () => {
      const isValid = isRangeFilterValid(stubIndexPattern, stubFields[0], {
        from: 'foo',
      });
      expect(isValid).toBe(true);
    });

    it('should return true for range filter with from/to', () => {
      const isValid = isRangeFilterValid(stubIndexPattern, stubFields[0], {
        from: 'foo',
        to: 'goo',
      });
      expect(isValid).toBe(true);
    });

    it('should return false for date range filter with bad from', () => {
      const isValid = isRangeFilterValid(stubIndexPattern, stubFields[4], {
        from: 'foo',
        to: 'now',
      });
      expect(isValid).toBe(false);
    });

    it('should return false for date range filter with bad to', () => {
      const isValid = isRangeFilterValid(stubIndexPattern, stubFields[4], {
        from: '2020-01-01',
        to: 'mau',
      });
      expect(isValid).toBe(false);
    });
  });
});
