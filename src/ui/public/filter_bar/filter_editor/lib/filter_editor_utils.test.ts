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

import { FilterStateStore, toggleFilterNegated } from '@kbn/es-query';
import { Field, IndexPattern } from 'ui/index_patterns';
import {
  buildFilter,
  getFieldFromFilter,
  getFilterableFields,
  getFilterParams,
  getIndexPatternFromFilter,
  getOperatorFromFilter,
  getOperatorOptions,
  getQueryDslFromFilter,
  isFilterValid,
} from './filter_editor_utils';
import { FILTER_OPERATORS } from './filter_operators';
import { existsFilter } from './fixtures/exists_filter';
import { phraseFilter } from './fixtures/phrase_filter';
import { phrasesFilter } from './fixtures/phrases_filter';
import { rangeFilter } from './fixtures/range_filter';

const mockFields: Field[] = [
  {
    name: 'machine.os',
    type: 'string',
    aggregatable: false,
    searchable: false,
    filterable: true,
  },
  {
    name: 'machine.os.raw',
    type: 'string',
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'not.filterable',
    type: 'string',
    aggregatable: true,
    searchable: true,
    filterable: false,
  },
  {
    name: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: '@timestamp',
    type: 'date',
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'clientip',
    type: 'ip',
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
];

const mockIndexPattern: IndexPattern = {
  id: 'logstash-*',
  title: 'logstash-*',
  fields: mockFields,
};

describe('Filter editor utils', () => {
  describe('getQueryDslFromFilter', () => {
    it('should return query DSL without meta and $state', () => {
      const queryDsl = getQueryDslFromFilter(phraseFilter);
      expect(queryDsl).not.toHaveProperty('meta');
      expect(queryDsl).not.toHaveProperty('$state');
    });
  });

  describe('getIndexPatternFromFilter', () => {
    it('should return the index pattern from the filter', () => {
      const indexPattern = getIndexPatternFromFilter(phraseFilter, [mockIndexPattern]);
      expect(indexPattern).toBe(mockIndexPattern);
    });
  });

  describe('getFieldFromFilter', () => {
    it('should return the field from the filter', () => {
      const field = getFieldFromFilter(phraseFilter, mockIndexPattern);
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

  describe('getFilterParams', () => {
    it('should retrieve params from phrase filter', () => {
      const params = getFilterParams(phraseFilter);
      expect(params).toBe('ios');
    });

    it('should retrieve params from phrases filter', () => {
      const params = getFilterParams(phrasesFilter);
      expect(params).toEqual(['win xp', 'osx']);
    });

    it('should retrieve params from range filter', () => {
      const params = getFilterParams(rangeFilter);
      expect(params).toEqual({ from: 0, to: 10 });
    });

    it('should return undefined for exists filter', () => {
      const params = getFilterParams(existsFilter);
      expect(params).toBeUndefined();
    });
  });

  describe('getFilterableFields', () => {
    it('returns the list of fields from the given index pattern', () => {
      const fieldOptions = getFilterableFields(mockIndexPattern);
      expect(fieldOptions.length).toBeGreaterThan(0);
    });

    it('limits the fields to the filterable fields', () => {
      const fieldOptions = getFilterableFields(mockIndexPattern);
      const nonFilterableFields = fieldOptions.filter(field => !field.filterable);
      expect(nonFilterableFields.length).toBe(0);
    });
  });

  describe('getOperatorOptions', () => {
    it('returns range for number fields', () => {
      const [field] = mockFields.filter(({ type }) => type === 'number');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find(operator => operator.type === 'range');
      expect(rangeOperator).not.toBeUndefined();
    });

    it('does not return range for string fields', () => {
      const [field] = mockFields.filter(({ type }) => type === 'string');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find(operator => operator.type === 'range');
      expect(rangeOperator).toBeUndefined();
    });
  });

  describe('isFilterValid', () => {
    it('should return false if index pattern is not provided', () => {
      const isValid = isFilterValid(undefined, mockFields[0], FILTER_OPERATORS[0], 'foo');
      expect(isValid).toBe(false);
    });

    it('should return false if field is not provided', () => {
      const isValid = isFilterValid(mockIndexPattern, undefined, FILTER_OPERATORS[0], 'foo');
      expect(isValid).toBe(false);
    });

    it('should return false if operator is not provided', () => {
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], undefined, 'foo');
      expect(isValid).toBe(false);
    });

    it('should return false for phrases filter without phrases', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'phrases');
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], operator, []);
      expect(isValid).toBe(false);
    });

    it('should return true for phrases filter with phrases', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'phrases');
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], operator, ['foo']);
      expect(isValid).toBe(true);
    });

    it('should return false for range filter without range', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'range');
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], operator, undefined);
      expect(isValid).toBe(false);
    });

    it('should return true for range filter with from', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'range');
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], operator, { from: 'foo' });
      expect(isValid).toBe(true);
    });

    it('should return true for range filter with from/to', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'range');
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], operator, {
        from: 'foo',
        too: 'goo',
      });
      expect(isValid).toBe(true);
    });

    it('should return true for exists filter without params', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'exists');
      const isValid = isFilterValid(mockIndexPattern, mockFields[0], operator);
      expect(isValid).toBe(true);
    });
  });

  describe('buildFilter', () => {
    it('should build phrase filters', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'phrase');
      const params = 'foo';
      const alias = 'bar';
      const state = FilterStateStore.APP_STATE;
      const filter = buildFilter(mockIndexPattern, mockFields[0], operator, params, alias, state);
      expect(filter.meta.negate).toBe(operator.negate);
      expect(filter.meta.alias).toBe(alias);
      expect(filter.$state.store).toBe(state);
    });

    it('should build phrases filters', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'phrases');
      const params = ['foo', 'bar'];
      const alias = 'bar';
      const state = FilterStateStore.APP_STATE;
      const filter = buildFilter(mockIndexPattern, mockFields[0], operator, params, alias, state);
      expect(filter.meta.type).toBe(operator.type);
      expect(filter.meta.negate).toBe(operator.negate);
      expect(filter.meta.alias).toBe(alias);
      expect(filter.$state.store).toBe(state);
    });

    it('should build range filters', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'range');
      const params = { from: 'foo', to: 'qux' };
      const alias = 'bar';
      const state = FilterStateStore.APP_STATE;
      const filter = buildFilter(mockIndexPattern, mockFields[0], operator, params, alias, state);
      expect(filter.meta.negate).toBe(operator.negate);
      expect(filter.meta.alias).toBe(alias);
      expect(filter.$state.store).toBe(state);
    });

    it('should build exists filters', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type }) => type === 'exists');
      const params = undefined;
      const alias = 'bar';
      const state = FilterStateStore.APP_STATE;
      const filter = buildFilter(mockIndexPattern, mockFields[0], operator, params, alias, state);
      expect(filter.meta.negate).toBe(operator.negate);
      expect(filter.meta.alias).toBe(alias);
      expect(filter.$state.store).toBe(state);
    });

    it('should negate based on operator', () => {
      const [operator] = FILTER_OPERATORS.filter(({ type, negate }) => type === 'exists' && negate);
      const params = undefined;
      const alias = 'bar';
      const state = FilterStateStore.APP_STATE;
      const filter = buildFilter(mockIndexPattern, mockFields[0], operator, params, alias, state);
      expect(filter.meta.negate).toBe(operator.negate);
      expect(filter.meta.alias).toBe(alias);
      expect(filter.$state.store).toBe(state);
    });
  });
});
