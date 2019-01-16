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

import dateMath from '@elastic/datemath';
import {
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildQueryFilter,
  buildRangeFilter,
  FieldFilter,
  FilterMeta,
  FilterStateStore,
  MetaFilter,
  PhraseFilter,
  PhrasesFilter,
  RangeFilter,
} from '@kbn/es-query';
import { omit } from 'lodash';
import { IndexPattern, IndexPatternField } from 'ui/index_patterns';
import Ipv4Address from 'ui/utils/ipv4_address';
import { FILTER_OPERATORS, Operator } from './filter_operators';

export function getIndexPatternFromFilter(
  filter: MetaFilter,
  indexPatterns: IndexPattern[]
): IndexPattern | undefined {
  return indexPatterns.find(indexPattern => indexPattern.id === filter.meta.index);
}

export function getFieldFromFilter(filter: FieldFilter, indexPattern: IndexPattern) {
  return indexPattern.fields.find((field: any) => field.name === filter.meta.key);
}

export function getOperatorFromFilter(filter: MetaFilter) {
  return FILTER_OPERATORS.find(operator => {
    return filter.meta.type === operator.type && filter.meta.negate === operator.negate;
  });
}

export function getQueryDslFromFilter(filter: MetaFilter) {
  return omit(filter, ['$state', 'meta']);
}

export function getFilterableFields(indexPatterns: IndexPattern[]) {
  return indexPatterns.reduce((fields: IndexPatternField[], indexPattern) => {
    const filterableFields = indexPattern.fields.filter(field => field.filterable);
    return [...fields, ...filterableFields];
  }, []);
}

export function getOperatorOptions(field: IndexPatternField) {
  return FILTER_OPERATORS.filter(operator => {
    return !operator.fieldTypes || operator.fieldTypes.includes(field.type);
  });
}

export function getFilterParams(filter: MetaFilter): any {
  switch (filter.meta.type) {
    case 'phrase':
      return (filter as PhraseFilter).meta.params.query;
    case 'phrases':
      return (filter as PhrasesFilter).meta.params;
    case 'range':
      return {
        from: (filter as RangeFilter).meta.params.gte,
        to: (filter as RangeFilter).meta.params.lt,
      };
  }
}

export function validateParams(params: any, type: string) {
  switch (type) {
    case 'date':
      const moment = typeof params === 'string' ? dateMath.parse(params) : null;
      return Boolean(typeof params === 'string' && moment && moment.isValid());
    case 'ip':
      try {
        return Boolean(new Ipv4Address(params));
      } catch (e) {
        return false;
      }
    default:
      return true;
  }
}

export function isFilterValid(
  indexPattern?: IndexPattern,
  field?: IndexPatternField,
  operator?: Operator,
  params?: any
) {
  if (!indexPattern || !field || !operator) {
    return false;
  }
  switch (operator.type) {
    case 'phrase':
      return validateParams(params, field.type);
    case 'phrases':
      if (!Array.isArray(params) || !params.length) {
        return false;
      }
      return params.every(phrase => validateParams(phrase, field.type));
    case 'range':
      if (typeof params !== 'object') {
        return false;
      }
      return validateParams(params.from, field.type) && validateParams(params.to, field.type);
    case 'exists':
      return true;
    default:
      throw new Error(`Unknown operator type: ${operator.type}`);
  }
}

export function buildFilter(
  indexPattern: IndexPattern,
  field: IndexPatternField,
  operator: Operator,
  params: any,
  alias: string | null,
  store: FilterStateStore
): MetaFilter {
  const filter = buildBaseFilter(indexPattern, field, operator, params);
  filter.meta.alias = alias;
  filter.meta.negate = operator.negate;
  filter.$state = { store };
  return filter;
}

function buildBaseFilter(
  indexPattern: IndexPattern,
  field: IndexPatternField,
  operator: Operator,
  params: any
): MetaFilter {
  switch (operator.type) {
    case 'phrase':
      return buildPhraseFilter(field, params, indexPattern);
    case 'phrases':
      return buildPhrasesFilter(field, params, indexPattern);
    case 'range':
      const newParams = { gte: params.from, lt: params.to };
      return buildRangeFilter(field, newParams, indexPattern);
    case 'exists':
      return buildExistsFilter(field, indexPattern);
    default:
      throw new Error(`Unknown operator type: ${operator.type}`);
  }
}

export function buildCustomFilter(
  index: string,
  queryDsl: any,
  disabled: boolean,
  negate: boolean,
  alias: string | null,
  store: FilterStateStore
): MetaFilter {
  const meta: FilterMeta = { index, type: 'custom', disabled, negate, alias };
  const filter: MetaFilter = { ...queryDsl, meta };
  filter.$state = { store };
  return filter;
}
