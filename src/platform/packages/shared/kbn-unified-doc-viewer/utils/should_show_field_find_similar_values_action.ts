/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DocViewFindSimilarValuesFn } from '../types';

interface Params {
  dataView: DataView | undefined;
  dataViewField: DataViewField | undefined;
  onFindSimilarValues: DocViewFindSimilarValuesFn | undefined;
}

/**
 * The "Find similar values" action is offered for text fields of time based data views.
 */
export function shouldShowFieldFindSimilarValuesAction({
  dataView,
  dataViewField,
  onFindSimilarValues,
}: Params): boolean {
  return (
    onFindSimilarValues !== undefined &&
    dataViewField?.esTypes?.includes('text') === true &&
    dataView?.isTimeBased() === true
  );
}

/**
 * Multi-valued fields use their first value.
 */
export function getFindSimilarValuesValue(value: unknown): string | undefined {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return firstValue === undefined || firstValue === null || firstValue === ''
    ? undefined
    : String(firstValue);
}
