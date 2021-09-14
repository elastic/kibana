/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AccessorFn, Accessor } from '@elastic/charts';
import { DatatableColumn } from '../../../../expressions';
import { KBN_FIELD_TYPES } from '../../../../data/public';
import { FakeParams } from '../../../../visualizations/public';
import { Aspect } from '../types';

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

export const isSimpleField = (format: Aspect['format']) => {
  const simpleFormats: string[] = [
    KBN_FIELD_TYPES.STRING,
    KBN_FIELD_TYPES.NUMBER,
    KBN_FIELD_TYPES.DATE,
    KBN_FIELD_TYPES.BOOLEAN,
  ];
  return simpleFormats.includes(format?.id ?? '');
};

export const applyFormatter = (aspect: Aspect, value: unknown, shouldApply: boolean = true) =>
  shouldApply ? aspect.formatter?.(value) ?? value : value;

export const applyFormatterIfSimpleField = (aspect: Aspect, value: unknown) =>
  applyFormatter(aspect, value, isSimpleField(aspect.format));

// complex field is a field, which has some specific structure, as `range`, for example, not pure value
export const applyFormatterIfComplexField = (aspect: Aspect, value: unknown) =>
  applyFormatter(aspect, value, !isSimpleField(aspect.format));

/**
 * Returns accessor function for complex accessor types
 * @param aspect
 * @param isComplex - forces to be functional/complex accessor
 */
export const getComplexAccessor = (fieldName: string) => (
  aspect: Aspect,
  index?: number
): AccessorFn | undefined => {
  // SHARD_DELAY is used only for dev purpose and need to handle separately.
  if (aspect.accessor === null || aspect.accessor === undefined || aspect.title === SHARD_DELAY) {
    return;
  }
  const accessor = aspect.accessor;

  const fn: AccessorFn = (d) => {
    const v = d[accessor];
    if (v === undefined) {
      return;
    }
    // Because of the specific logic of chart, it cannot compare complex values to display,
    // thats why it is necessary to apply formatters before its comparison while rendering.
    // What about simple values, formatting them at this step is breaking the logic of intervals (xDomain).
    // If the value will be formatted on this step, it will be rendered without any respect to the passed bounds
    // and the chart will render not all the range, but only the part of range, which contains data.
    return applyFormatterIfComplexField(aspect, v);
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

// For percentile aggregation id is comming in the form `%d.%d`, where first `%d` is `id` and the second - `percents`
export const isPercentileIdEqualToSeriesId = (columnId: number | string, seriesColumnId: string) =>
  columnId.toString().split('.')[0] === seriesColumnId;

export const isValidSeriesForDimension = (seriesColumnId: string) => ({
  id,
  accessor,
}: {
  id?: string | number;
  accessor?: string | number | DatatableColumn | null;
}) =>
  (id === seriesColumnId || isPercentileIdEqualToSeriesId(id ?? '', seriesColumnId)) &&
  accessor !== null;
