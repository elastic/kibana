/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DateHistogramIndexPatternColumn, FieldBasedIndexPatternColumn, FiltersIndexPatternColumn, GenericIndexPatternColumn, RangeIndexPatternColumn, TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import { fromHistogramColumn, getHistogramColumn } from './date_histogram';
import { fromTopValuesColumn, getTopValuesColumn } from './top_values';
import { fromIntervalsColumn, getIntervalsColumn } from './intervals';
import { fromFiltersColumn, getFiltersColumn } from './filters';
import { LensApiBucketOperations, LensApiDateHistogramOperation, LensApiFilterOperation, LensApiHistogramOperation, LensApiRangeOperation, LensApiTermsOperation } from '../schema/bucket_ops';

const DEFAULT_BREAKDOWN_SIZE = 5;

export const getBreakdownColumn = ({
  options,
  dataView,
}: {
  options: LensApiBucketOperations;
  dataView: DataView;
}): GenericIndexPatternColumn => {
  const breakdownType = options.operation;
  const field: string =
    typeof options === 'string' ? options : 'field' in options ? options.field : '';
  const config = typeof options !== 'string' ? options : {};

  switch (breakdownType) {
    case 'date_histogram':
      return getHistogramColumn({
        options: {
          sourceField: field,
          params:
            typeof options !== 'string'
              ? {
                  interval: (options as LensApiDateHistogramOperation).suggested_interval || 'auto',
                }
              : {
                  interval: 'auto',
                },
        },
      });
    case 'terms':
      const topValuesOptions = config as LensApiTermsOperation;
      return getTopValuesColumn({
        field,
        options: {
          size: topValuesOptions.size || DEFAULT_BREAKDOWN_SIZE,
        },
      });
    case 'range':
      const intervalOptions = config as LensApiRangeOperation;
      return getIntervalsColumn({
        field,
        options: {
          type: 'range',
          ranges: [
            {
              from: 0,
              to: 1000,
              label: '',
            },
          ],
          maxBars: 'auto',
        },
      });
    case 'filters':
      const filterOptions = config as LensApiFilterOperation;
      return getFiltersColumn({
        options: {
          filters: filterOptions.filters.map((f) => ({
            label: f.label || '',
            input: {
              language: 'kuery',
              query: f.query,
            },
          })),
        },
      });

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