/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get, hasIn } from 'lodash';
import {
  FilterValueFormatter,
  RangeFilter,
  isScriptedRangeFilter,
  isRangeFilter,
  Filter,
  FILTERS,
} from '../../../../../common';

const getFormattedValueFn = (left: any, right: any) => {
  return (formatter?: FilterValueFormatter) => {
    let displayValue = `${left} to ${right}`;
    if (formatter) {
      const convert = formatter.getConverterFor('text');
      displayValue = `${convert(left)} to ${convert(right)}`;
    }
    return displayValue;
  };
};

const getFirstRangeKey = (filter: RangeFilter) => filter.range && Object.keys(filter.range)[0];
const getRangeByKey = (filter: RangeFilter, key: string) => get(filter, ['range', key]);

function getParams(filter: RangeFilter) {
  const isScriptedRange = isScriptedRangeFilter(filter);
  const key: string = (isScriptedRange ? filter.meta.field : getFirstRangeKey(filter)) || '';
  const params: any = isScriptedRange
    ? get(filter, 'script.script.params')
    : getRangeByKey(filter, key);

  let left = hasIn(params, 'gte') ? params.gte : params.gt;
  if (left == null) left = -Infinity;

  let right = hasIn(params, 'lte') ? params.lte : params.lt;
  if (right == null) right = Infinity;

  const value = getFormattedValueFn(left, right);

  return { type: FILTERS.RANGE, key, value, params };
}

export const isMapRangeFilter = (filter: any): filter is RangeFilter =>
  isRangeFilter(filter) || isScriptedRangeFilter(filter);

export const mapRange = (filter: Filter) => {
  if (!isMapRangeFilter(filter)) {
    throw filter;
  }

  return getParams(filter);
};
