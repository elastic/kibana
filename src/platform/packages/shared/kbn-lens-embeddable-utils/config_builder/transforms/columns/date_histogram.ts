/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiDateHistogramOperation } from '../../schema/bucket_ops';
import { getLensAPIBucketSharedProps, getLensStateBucketSharedProps } from './utils';

export function fromDateHistogramLensApiToLensState(
  options: LensApiDateHistogramOperation
): DateHistogramIndexPatternColumn {
  const {
    field,
    suggested_interval,
    use_original_time_range,
    include_empty_rows,
    drop_partial_intervals,
    label,
  } = options;

  return {
    operationType: 'date_histogram',
    dataType: 'date',
    ...getLensStateBucketSharedProps({ label, field }),
    params: {
      interval: suggested_interval,
      includeEmptyRows: include_empty_rows,
      dropPartials: Boolean(drop_partial_intervals),
      ignoreTimeRange: use_original_time_range,
    },
  };
}

export function fromDateHistogramLensStateToAPI(
  column: DateHistogramIndexPatternColumn
): LensApiDateHistogramOperation {
  return {
    operation: 'date_histogram',
    ...getLensAPIBucketSharedProps(column),
    suggested_interval: column.params.interval,
    use_original_time_range: Boolean(column.params.ignoreTimeRange),
    include_empty_rows: Boolean(column.params.includeEmptyRows),
    drop_partial_intervals: Boolean(column.params.dropPartials),
  };
}
