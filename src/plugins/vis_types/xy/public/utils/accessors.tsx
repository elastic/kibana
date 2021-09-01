/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AccessorFn, Accessor } from '@elastic/charts';
import { KBN_FIELD_TYPES } from '../../../../data/public';
import { FakeParams } from '../../../../visualizations/public';
import { Aspect } from '../types';

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

export const isSimpleField = (format: Aspect['format']) => {
  const simpleFormats: string[] = [
    KBN_FIELD_TYPES.STRING,
    KBN_FIELD_TYPES.NUMBER,
    KBN_FIELD_TYPES.DATE,
    KBN_FIELD_TYPES.BOOLEAN,
  ];
  return simpleFormats.includes(format?.id ?? '');
};

/**
 * Returns accessor function for complex accessor types
 * @param aspect
 * @param isComplex - forces to be functional/complex accessor
 */
export const getComplexAccessor = (fieldName: string) => (
  aspect: Aspect,
  index?: number
): Accessor | AccessorFn | undefined => {
  if (!aspect.accessor) {
    return;
  }
  const formatter = aspect.formatter;
  const accessor = aspect.accessor;

  const fn: AccessorFn = (d) => {
    const v = d[accessor];
    if (v === undefined) {
      return;
    }
    return isSimpleField(aspect.format) ? v : formatter?.(v) ?? v;
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
