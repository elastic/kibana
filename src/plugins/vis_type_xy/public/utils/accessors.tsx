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

export const isRangeAggType = (type: string | null) =>
  type === BUCKET_TYPES.DATE_RANGE || type === BUCKET_TYPES.RANGE;

/**
 * Returns accessor function for complex accessor types
 * @param aspect
 * @param isComplex - forces to be functional/complex accessor
 */
export const getComplexAccessor = (fieldName: string, isComplex: boolean = false) => (
  aspect: Aspect,
  index?: number
): Accessor | AccessorFn | undefined => {
  if (!aspect.accessor) {
    return;
  }

  if (!((isComplex || isRangeAggType(aspect.aggType)) && aspect.formatter)) {
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
