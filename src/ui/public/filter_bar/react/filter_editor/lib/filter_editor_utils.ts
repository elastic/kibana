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

import { omit } from 'lodash';
import { IndexPattern, IndexPatternField } from 'ui/index_patterns';
import { FieldFilter, MetaFilter, PhraseFilter } from '../../../filters';
import { FILTER_OPERATORS } from './filter_operators';

export function getIndexPatternFromFilter(
  filter: MetaFilter,
  indexPatterns: IndexPattern[]
): IndexPattern | undefined {
  return indexPatterns.find(indexPattern => indexPattern.id === filter.meta.index);
}

export function getFieldFromFilter(filter: FieldFilter, indexPattern: IndexPattern) {
  return indexPattern.fields.find((field: any) => field.name === filter.meta.key);
}

export function getOperatorFromFilter(filter: MetaFilter | undefined) {
  return (
    filter &&
    FILTER_OPERATORS.find(operator => {
      return filter.meta.type === operator.type && filter.meta.negate === operator.negate;
    })
  );
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

export function getFilterParams(filter?: MetaFilter): any {
  if (filter && filter.meta.type === 'phrase') {
    return (filter as PhraseFilter).meta.params.query;
  }
}
