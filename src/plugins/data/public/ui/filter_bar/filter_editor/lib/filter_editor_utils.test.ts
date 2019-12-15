/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  existsFilter,
  phraseFilter,
  phrasesFilter,
  rangeFilter,
  stubIndexPattern,
  stubFields,
} from '../../../../stubs';
import { esFilters } from '../../../../index';
import {
  getFieldFromFilter,
  getFilterableFields,
  getOperatorFromFilter,
  getOperatorOptions,
  isFilterValid,
} from './filter_editor_utils';

import { existsOperator, isBetweenOperator, isOneOfOperator, isOperator } from './filter_operators';

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
      const negatedPhraseFilter = esFilters.toggleFilterNegated(phraseFilter);
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
      const negatedPhrasesFilter = esFilters.toggleFilterNegated(phrasesFilter);
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
      const negatedRangeFilter = esFilters.toggleFilterNegated(rangeFilter);
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
      const negatedExistsFilter = esFilters.toggleFilterNegated(existsFilter);
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
      const nonFilterableFields = fieldOptions.filter(field => !field.filterable);
      expect(nonFilterableFields.length).toBe(0);
    });
  });

  describe('getOperatorOptions', () => {
    it('returns range for number fields', () => {
      const [field] = stubFields.filter(({ type }) => type === 'number');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find(operator => operator.type === 'range');
      expect(rangeOperator).not.toBeUndefined();
    });

    it('does not return range for string fields', () => {
      const [field] = stubFields.filter(({ type }) => type === 'string');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find(operator => operator.type === 'range');
      expect(rangeOperator).toBeUndefined();
    });
  });

  describe('isFilterValid', () => {
    it('should return false if index pattern is not provided', () => {
      const isValid = isFilterValid(undefined, stubFields[0], isOperator, 'foo');
      expect(isValid).toBe(false);
    });

    it('should return false if field is not provided', () => {
      const isValid = isFilterValid(stubIndexPattern, undefined, isOperator, 'foo');
      expect(isValid).toBe(false);
    });

    it('should return false if operator is not provided', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], undefined, 'foo');
      expect(isValid).toBe(false);
    });

    it('should return false for phrases filter without phrases', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], isOneOfOperator, []);
      expect(isValid).toBe(false);
    });

    it('should return true for phrases filter with phrases', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], isOneOfOperator, ['foo']);
      expect(isValid).toBe(true);
    });

    it('should return false for range filter without range', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], isBetweenOperator, undefined);
      expect(isValid).toBe(false);
    });

    it('should return true for range filter with from', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], isBetweenOperator, {
        from: 'foo',
      });
      expect(isValid).toBe(true);
    });

    it('should return true for range filter with from/to', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], isBetweenOperator, {
        from: 'foo',
        too: 'goo',
      });
      expect(isValid).toBe(true);
    });

    it('should return true for exists filter without params', () => {
      const isValid = isFilterValid(stubIndexPattern, stubFields[0], existsOperator);
      expect(isValid).toBe(true);
    });
  });
});
