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

import _ from 'lodash';
import { FILTER_OPERATORS } from './filter_operators';

export function getQueryDslFromFilter(filter) {
  return _(filter)
    .omit(['meta', '$state'])
    .cloneDeep();
}

export function getFieldFromFilter(filter, indexPatterns) {
  const { index, key } = filter.meta;
  return indexPatterns.get(index)
    .then(indexPattern => indexPattern.id && indexPattern.fields.byName[key]);
}

export function getOperatorFromFilter(filter) {
  const { type, negate } = filter.meta;
  return FILTER_OPERATORS.find((operator) => {
    return operator.type === type && operator.negate === negate;
  });
}

export function getParamsFromFilter(filter) {
  const { type, key } = filter.meta;
  let params;
  if (type === 'phrase') {
    params = filter.query ? filter.query.match[key].query : filter.script.script.params.value;
  } else if (type === 'phrases') {
    params = filter.meta.params;
  } else if (type === 'range') {
    const range = filter.range ? filter.range[key] : filter.script.script.params;
    const from = _.has(range, 'gte') ? range.gte : range.gt;
    const to = _.has(range, 'lte') ? range.lte : range.lt;
    params = { from, to };
  }
  return {
    [type]: params
  };
}

export function getFilterableFields(indexPatterns) {
  return (indexPatterns || []).reduce((fields, indexPattern) => {
    const filterableFields = indexPattern.fields.filter(field => field.filterable);
    return [...fields, ...filterableFields];
  }, []);
}

export function getOperatorOptions(field) {
  const type = _.get(field, 'type');
  return FILTER_OPERATORS.filter((operator) => {
    return !operator.fieldTypes || operator.fieldTypes.includes(type);
  });
}

export function isFilterValid({ field, operator, params }) {
  if (!field || !operator) {
    return false;
  } else if (operator.type === 'phrase') {
    return _.has(params, 'phrase') && params.phrase !== '';
  } else if (operator.type === 'phrases') {
    return _.has(params, 'phrases') && params.phrases.length > 0;
  } else if (operator.type === 'range') {
    const hasFrom = _.has(params, ['range', 'from']) && params.range.from !== '';
    const hasTo = _.has(params, ['range', 'to']) && params.range.to !== '';
    return hasFrom || hasTo;
  }
  return true;
}

export function buildFilter({ indexPattern, field, operator, params, filterBuilder }) {
  let filter;
  if (operator.type === 'phrase') {
    filter = filterBuilder.buildPhraseFilter(field, params.phrase, indexPattern);
  } else if (operator.type === 'phrases') {
    filter = filterBuilder.buildPhrasesFilter(field, params.phrases, indexPattern);
  } else if (operator.type === 'range') {
    filter = filterBuilder.buildRangeFilter(field, { gte: params.range.from, lt: params.range.to }, indexPattern);
  } else if (operator.type === 'exists') {
    filter = filterBuilder.buildExistsFilter(field, indexPattern);
  }
  filter.meta.negate = operator.negate;
  return filter;
}

export function areIndexPatternsProvided(indexPatterns) {
  return _.compact(indexPatterns).length !== 0;
}

export function isFilterPinned(filter, pinnedByDefault) {
  if (!filter.hasOwnProperty('$state')) return pinnedByDefault;
  return filter.$state.store === 'globalState';
}
