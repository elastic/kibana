/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  DateHistogramIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FiltersIndexPatternColumn,
  GenericIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { fromHistogramColumn, getHistogramColumn } from './date_histogram';
import { fromTopValuesColumn, getTopValuesColumn } from './top_values';
import { fromIntervalsColumn, getIntervalsColumn } from './intervals';
import { fromFiltersColumn, getFiltersColumn } from './filters';
import {
  LensApiBucketOperations,
  LensApiDateHistogramOperation,
  LensApiFilterOperation,
  LensApiRangeOperation,
  LensApiTermsOperation,
} from '../schema/bucket_ops';

export const getBreakdownColumn = ({
  options,
}: {
  options: LensApiBucketOperations;
  dataView: DataView;
}): GenericIndexPatternColumn => {
  const breakdownType = options.operation;

  switch (breakdownType) {
    case 'date_histogram':
      return getHistogramColumn(options as LensApiDateHistogramOperation);
    case 'terms':
      return getTopValuesColumn(options as LensApiTermsOperation);
    case 'range':
      return getIntervalsColumn(options as LensApiRangeOperation);
    case 'filters':
      return getFiltersColumn(options as LensApiFilterOperation);

    default:
      throw new Error(`Unsupported breakdown type: ${breakdownType}`);
  }
};

export const fromBreakdownColumn = (
  column: FieldBasedIndexPatternColumn
): LensApiBucketOperations => {
  if (column.operationType === 'date_histogram') {
    return fromHistogramColumn(column as DateHistogramIndexPatternColumn);
  } else if (column.operationType === 'terms') {
    return fromTopValuesColumn(column as TermsIndexPatternColumn);
  } else if (column.operationType === 'intervals') {
    return fromIntervalsColumn(column as RangeIndexPatternColumn);
  } else if (column.operationType === 'filters') {
    return fromFiltersColumn(column as unknown as FiltersIndexPatternColumn);
  }
  throw new Error(`Unsupported breakdown column type: ${column.operationType}`);
};
