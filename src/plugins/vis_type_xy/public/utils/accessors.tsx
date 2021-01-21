/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AccessorFn, Accessor } from '@elastic/charts';
import { BUCKET_TYPES } from '../../../data/public';
import { FakeParams, Aspect } from '../types';

export const COMPLEX_X_ACCESSOR = '__customXAccessor__';
export const COMPLEX_SPLIT_ACCESSOR = '__complexSplitAccessor__';

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

/**
 * Returns accessor function for complex accessor types
 * @param aspect
 */
export const getComplexAccessor = (fieldName: string) => (
  aspect: Aspect,
  index?: number
): Accessor | AccessorFn | undefined => {
  if (!aspect.accessor) {
    return;
  }

  if (
    !(
      (aspect.aggType === BUCKET_TYPES.DATE_RANGE || aspect.aggType === BUCKET_TYPES.RANGE) &&
      aspect.formatter
    )
  ) {
    return aspect.accessor;
  }

  const formatter = aspect.formatter;
  const accessor = aspect.accessor;
  const fn: AccessorFn = (d) => {
    const v = d[accessor];
    if (!v) {
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
