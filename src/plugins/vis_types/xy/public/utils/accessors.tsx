/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AccessorFn, Accessor } from '@elastic/charts';
import { BUCKET_TYPES } from '../../../../data/public';
import { FakeParams } from '../../../../visualizations/public';
import type { Aspect } from '../types';

export const COMPLEX_X_ACCESSOR = '__customXAccessor__';
export const COMPLEX_SPLIT_ACCESSOR = '__complexSplitAccessor__';
const SHARD_DELAY = 'shard_delay';

export const getXAccessor = (aspect: Aspect): Accessor | AccessorFn => {
  return (
    getComplexAccessor(COMPLEX_X_ACCESSOR)(aspect) ??
    (() => (aspect.params as FakeParams)?.defaultValue)
  );
};

const getFieldName = (fieldName: string, index?: number) => {
  const indexStr = index !== undefined ? `::${index}` : '';

  return `${fieldName}${indexStr}`;
};

export const isRangeAggType = (type: string | null) =>
  type === BUCKET_TYPES.DATE_RANGE || type === BUCKET_TYPES.RANGE || type === BUCKET_TYPES.IP_RANGE;

/**
 * Returns accessor function for complex accessor types
 * @param aspect
 * @param isComplex - forces to be functional/complex accessor
 */
export const getComplexAccessor =
  (fieldName: string, isComplex: boolean = false) =>
  (aspect: Aspect, index?: number): Accessor | AccessorFn | undefined => {
    if (!aspect.accessor || aspect.aggType === SHARD_DELAY) {
      return;
    }

    if (!((isComplex || isRangeAggType(aspect.aggType)) && aspect.formatter)) {
      return aspect.accessor;
    }

    const formatter = aspect.formatter;
    const accessor = aspect.accessor;
    const fn: AccessorFn = (d) => {
      const v = d[accessor];
      if (v === undefined) {
        return;
      }
      const f = formatter(v);
      return f;
    };

    fn.fieldName = getFieldName(fieldName, index);

    return fn;
  };

export const getSplitSeriesAccessorFnMap = (
  splitSeriesAccessors: Array<Accessor | AccessorFn>
): Map<string | number, AccessorFn> => {
  const m = new Map<string | number, AccessorFn>();

  splitSeriesAccessors.forEach((accessor, index) => {
    if (typeof accessor === 'function') {
      const fieldName = getFieldName(COMPLEX_SPLIT_ACCESSOR, index);
      m.set(fieldName, accessor);
    }
  });

  return m;
};

// For percentile, the aggregation id is coming in the form %s.%d, where %s is agg_id and %d - percents
export const getSafeId = (columnId?: number | string | null) => {
  const id = String(columnId);
  // only multi-value aggs like percentiles are allowed to contain dots and [
  const isMultiValueId = id.includes('[') || id.includes('.');
  if (!isMultiValueId) {
    return id;
  }
  const baseId = id.substring(0, id.indexOf('[') !== -1 ? id.indexOf('[') : id.indexOf('.'));
  return baseId;
};

export const isPercentileIdEqualToSeriesId = (
  columnId: number | string | null | undefined,
  seriesColumnId: string
) => getSafeId(columnId) === seriesColumnId;

export const isValidSeriesForDimension = (seriesColumnId: string, { aggId, accessor }: Aspect) =>
  (aggId === seriesColumnId || isPercentileIdEqualToSeriesId(aggId ?? '', seriesColumnId)) &&
  accessor !== null;
