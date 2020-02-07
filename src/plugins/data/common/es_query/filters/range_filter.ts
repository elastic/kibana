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
import { map, reduce, mapValues, get, keys, pick } from 'lodash';
import { Filter, FilterMeta } from './meta_filter';
import { IIndexPattern, IFieldType } from '../../index_patterns';

const OPERANDS_IN_RANGE = 2;

const operators = {
  gt: '>',
  gte: '>=',
  lte: '<=',
  lt: '<',
};
const comparators = {
  gt: 'boolean gt(Supplier s, def v) {return s.get() > v}',
  gte: 'boolean gte(Supplier s, def v) {return s.get() >= v}',
  lte: 'boolean lte(Supplier s, def v) {return s.get() <= v}',
  lt: 'boolean lt(Supplier s, def v) {return s.get() < v}',
};

const dateComparators = {
  gt: 'boolean gt(Supplier s, def v) {return s.get().toInstant().isAfter(Instant.parse(v))}',
  gte: 'boolean gte(Supplier s, def v) {return !s.get().toInstant().isBefore(Instant.parse(v))}',
  lte: 'boolean lte(Supplier s, def v) {return !s.get().toInstant().isAfter(Instant.parse(v))}',
  lt: 'boolean lt(Supplier s, def v) {return s.get().toInstant().isBefore(Instant.parse(v))}',
};

export interface RangeFilterParams {
  from?: number | string;
  to?: number | string;
  gt?: number | string;
  lt?: number | string;
  gte?: number | string;
  lte?: number | string;
  format?: string;
}

const hasRangeKeys = (params: RangeFilterParams) =>
  Boolean(
    keys(params).find((key: string) => ['gte', 'gt', 'lte', 'lt', 'from', 'to'].includes(key))
  );

export type RangeFilterMeta = FilterMeta & {
  params: RangeFilterParams;
  field?: any;
  formattedValue?: string;
};

export interface EsRangeFilter {
  range: { [key: string]: RangeFilterParams };
}

export type RangeFilter = Filter &
  EsRangeFilter & {
    meta: RangeFilterMeta;
    script?: {
      script: {
        params: any;
        lang: string;
        source: any;
      };
    };
    match_all?: any;
  };

export const isRangeFilter = (filter: any): filter is RangeFilter => filter && filter.range;

export const isScriptedRangeFilter = (filter: any): filter is RangeFilter => {
  const params: RangeFilterParams = get(filter, 'script.script.params', {});

  return hasRangeKeys(params);
};

export const getRangeFilterField = (filter: RangeFilter) => {
  return filter.range && Object.keys(filter.range)[0];
};

const formatValue = (field: IFieldType, params: any[]) =>
  map(params, (val: any, key: string) => get(operators, key) + format(field, val)).join(' ');

const format = (field: IFieldType, value: any) =>
  field && field.format && field.format.convert ? field.format.convert(value) : value;

// Creates a filter where the value for the given field is in the given range
// params should be an object containing `lt`, `lte`, `gt`, and/or `gte`
export const buildRangeFilter = (
  field: IFieldType,
  params: RangeFilterParams,
  indexPattern: IIndexPattern,
  formattedValue?: string
): RangeFilter => {
  const filter: any = { meta: { index: indexPattern.id, params: {} } };

  if (formattedValue) {
    filter.meta.formattedValue = formattedValue;
  }

  params = mapValues(params, value => (field.type === 'number' ? parseFloat(value) : value));

  if ('gte' in params && 'gt' in params) throw new Error('gte and gt are mutually exclusive');
  if ('lte' in params && 'lt' in params) throw new Error('lte and lt are mutually exclusive');

  const totalInfinite = ['gt', 'lt'].reduce((acc: number, op: any) => {
    const key = op in params ? op : `${op}e`;
    const isInfinite = Math.abs(get(params, key)) === Infinity;

    if (isInfinite) {
      acc++;

      // @ts-ignore
      delete params[key];
    }

    return acc;
  }, 0);

  if (totalInfinite === OPERANDS_IN_RANGE) {
    filter.match_all = {};
    filter.meta.field = field.name;
  } else if (field.scripted) {
    filter.script = getRangeScript(field, params);
    filter.script.script.params.value = formatValue(field, filter.script.script.params);

    filter.meta.field = field.name;
  } else {
    filter.range = {};
    filter.range[field.name] = params;
  }

  return filter as RangeFilter;
};

export const getRangeScript = (field: IFieldType, params: RangeFilterParams) => {
  const knownParams = pick(params, (val, key: any) => key in operators);
  let script = map(
    knownParams,
    (val: any, key: string) => '(' + field.script + ')' + get(operators, key) + key
  ).join(' && ');

  // We must wrap painless scripts in a lambda in case they're more than a simple expression
  if (field.lang === 'painless') {
    const comp = field.type === 'date' ? dateComparators : comparators;
    const currentComparators = reduce(
      knownParams,
      (acc, val, key) => acc.concat(get(comp, key)),
      []
    ).join(' ');

    const comparisons = map(
      knownParams,
      (val, key) => `${key}(() -> { ${field.script} }, params.${key})`
    ).join(' && ');

    script = `${currentComparators}${comparisons}`;
  }

  return {
    script: {
      source: script,
      params: knownParams,
      lang: field.lang,
    },
  };
};
