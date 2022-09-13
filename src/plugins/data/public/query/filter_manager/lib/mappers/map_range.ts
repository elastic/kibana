/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import {
  ScriptedRangeFilter,
  RangeFilter,
  isScriptedRangeFilter,
  isRangeFilter,
  Filter,
  FILTERS,
} from '@kbn/es-query';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

export function getRangeDisplayValue(
  { meta: { params } }: RangeFilter | ScriptedRangeFilter,
  formatter?: FieldFormat
) {
  const left = params.gte ?? params.gt ?? -Infinity;
  const right = params.lte ?? params.lt ?? Infinity;
  if (!formatter) return `${left} to ${right}`;
  const convert = formatter.getConverterFor('text');
  return `${convert(left)} to ${convert(right)}`;
}

const getFirstRangeKey = (filter: RangeFilter) =>
  filter.query.range && Object.keys(filter.query.range)[0];
const getRangeByKey = (filter: RangeFilter, key: string) => get(filter.query, ['range', key]);

function getParams(filter: RangeFilter) {
  const isScriptedRange = isScriptedRangeFilter(filter);
  const key: string = (isScriptedRange ? filter.meta.field : getFirstRangeKey(filter)) || '';
  const params: any = isScriptedRange
    ? get(filter.query, 'script.script.params')
    : getRangeByKey(filter, key);

  return { type: FILTERS.RANGE, key, value: params, params };
}

export const isMapRangeFilter = (filter: any): filter is RangeFilter =>
  isRangeFilter(filter) || isScriptedRangeFilter(filter);

export const mapRange = (filter: Filter) => {
  if (!isMapRangeFilter(filter)) {
    throw filter;
  }

  return getParams(filter);
};
