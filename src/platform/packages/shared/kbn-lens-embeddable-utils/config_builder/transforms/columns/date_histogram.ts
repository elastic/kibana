/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { LensApiDateHistogramOperation } from '../../schema/bucket_ops';
import {
  LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
  LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
  LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
} from '../../schema/constants';

function ofName(field: string, interval: string = '1h'): string {
  return `${field} per ${interval}`;
}

export function fromDateHistogramLensApiToLensState(
  options: LensApiDateHistogramOperation
): DateHistogramIndexPatternColumn {
  const {
    field,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    suggested_interval,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    use_original_time_rangeoverride_time_range,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    include_empty_rows,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    drop_partial_intervals,
    label,
  } = options;

  return {
    operationType: 'date_histogram',
    sourceField: field,
    customLabel: label != null,
    label: label ?? ofName(field, suggested_interval),
    isBucketed: true,
    dataType: 'date',
    params: {
      interval: suggested_interval ?? LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT,
      includeEmptyRows: include_empty_rows ?? LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT,
      dropPartials: Boolean(drop_partial_intervals),
      ignoreTimeRange:
        use_original_time_rangeoverride_time_range ?? LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT,
    },
  };
}

export function fromDateHistogramLensStateToAPI(
  column: DateHistogramIndexPatternColumn
): LensApiDateHistogramOperation {
  return {
    operation: 'date_histogram',
    field: column.sourceField,
    label: column.label,
    suggested_interval: column.params.interval,
    use_original_time_rangeoverride_time_range: column.params.ignoreTimeRange,
    include_empty_rows: column.params.includeEmptyRows,
    drop_partial_intervals: column.params.dropPartials,
  };
}
