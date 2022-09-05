/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsMapping, BUCKET_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { convertToDateHistogramColumn } from '../convert/date_histogram';

export type BucketAggs = BUCKET_TYPES.TERMS | BUCKET_TYPES.DATE_HISTOGRAM | BUCKET_TYPES.FILTERS;

export const getBucketColumns = (
  aggType: BUCKET_TYPES,
  aggParams: AggParamsMapping[BucketAggs],
  label: string,
  dataView: DataView,
  isSplit: boolean = false
) => {
  switch (aggType) {
    case BUCKET_TYPES.DATE_HISTOGRAM:
      return convertToDateHistogramColumn(aggParams, label, dataView, isSplit);
  }
};
