/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { map, reduce, mapValues, has, get, keys, pickBy } from 'lodash';
import type { Filter, FilterMeta } from './types';
import type { DataViewBase, DataViewFieldBase } from '../../es_query';

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

/**
 * An interface for all possible range filter params
 * It is similar, but not identical to estypes.QueryDslRangeQuery
 * @public
 */
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
  field?: string;
  formattedValue?: string;
};

export type ScriptedRangeFilter = Filter & {
  meta: RangeFilterMeta;
  query: {
    script: {
      script: estypes.InlineScript;
    };
  };
};

export type MatchAllRangeFilter = Filter & {
  meta: RangeFilterMeta;
  query: {
    match_all: estypes.QueryDslQueryContainer['match_all'];
  };
};

/**
 * @public
 */
export type RangeFilter = Filter & {
  meta: RangeFilterMeta;
  query: {
    range: { [key: string]: RangeFilterParams };
  };
};

/**
 * @param filter
 * @returns `true` if a filter is an `RangeFilter`
 *
 * @public
 */
export const isRangeFilter = (filter?: Filter): filter is RangeFilter => has(filter, 'query.range');

/**
 *
 * @param filter
 * @returns `true` if a filter is a scripted `RangeFilter`
 *
 * @public
 */
export const isScriptedRangeFilter = (filter: Filter): filter is ScriptedRangeFilter => {
  const params: RangeFilterParams = get(filter, 'query.script.script.params', {});

  return hasRangeKeys(params);
};

/**
 * @internal
 */
export const getRangeFilterField = (filter: RangeFilter) => {
  return filter.query.range && Object.keys(filter.query.range)[0];
};

const formatValue = (params: any[]) =>
  map(params, (val: any, key: string) => get(operators, key) + val).join(' ');

/**
 * Creates a filter where the value for the given field is in the given range
 * params should be an object containing `lt`, `lte`, `gt`, and/or `gte`
 *
 * @param field
 * @param params
 * @param indexPattern
 * @param formattedValue
 * @returns
 *
 * @public
 */
export const buildRangeFilter = (
  field: DataViewFieldBase,
  params: RangeFilterParams,
  indexPattern: DataViewBase,
  formattedValue?: string
): RangeFilter | ScriptedRangeFilter | MatchAllRangeFilter => {
  params = mapValues(params, (value: any) => (field.type === 'number' ? parseFloat(value) : value));

  if ('gte' in params && 'gt' in params) throw new Error('gte and gt are mutually exclusive');
  if ('lte' in params && 'lt' in params) throw new Error('lte and lt are mutually exclusive');

  const totalInfinite = ['gt', 'lt'].reduce((acc, op) => {
    const key = op in params ? op : `${op}e`;
    const isInfinite = Math.abs(get(params, key)) === Infinity;

    if (isInfinite) {
      acc++;

      // @ts-ignore
      delete params[key];
    }

    return acc;
  }, 0);

  const meta: RangeFilterMeta = {
    index: indexPattern.id,
    params: {},
    field: field.name,
    ...(formattedValue ? { formattedValue } : {}),
  };

  if (totalInfinite === OPERANDS_IN_RANGE) {
    return { meta, query: { match_all: {} } } as MatchAllRangeFilter;
  } else if (field.scripted) {
    const scr = getRangeScript(field, params);
    // TODO: type mismatch enforced
    scr.script.params.value = formatValue(scr.script.params as any);
    return { meta, query: { script: scr } } as ScriptedRangeFilter;
  } else {
    return { meta, query: { range: { [field.name]: params } } } as RangeFilter;
  }
};

/**
 * @internal
 */
export const getRangeScript = (field: DataViewFieldBase, params: RangeFilterParams) => {
  const knownParams: estypes.InlineScript['params'] = mapValues(
    pickBy(params, (val, key) => key in operators),
    (value) => (field.type === 'number' && typeof value === 'string' ? parseFloat(value) : value)
  );
  let script = map(
    knownParams,
    (_: unknown, key) => '(' + field.script + ')' + get(operators, key) + key
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
      lang: field.lang!,
    },
  };
};
