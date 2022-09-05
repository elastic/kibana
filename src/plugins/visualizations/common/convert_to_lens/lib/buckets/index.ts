/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsMapping, BUCKET_TYPES, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SchemaConfig } from '../../..';
import { convertToDateHistogramColumn } from '../convert/date_histogram';
import { getLabel } from '../utils';

export type BucketAggs = BUCKET_TYPES.TERMS | BUCKET_TYPES.DATE_HISTOGRAM | BUCKET_TYPES.FILTERS;
const SUPPORTED_BUCKETS: string[] = [
  BUCKET_TYPES.TERMS,
  BUCKET_TYPES.DATE_HISTOGRAM,
  BUCKET_TYPES.FILTERS,
];

const isSupprtedBucketAgg = (agg: SchemaConfig): agg is SchemaConfig<BucketAggs> => {
  return SUPPORTED_BUCKETS.includes(agg.aggType);
};

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

export const convertBucketToColumns = <T extends METRIC_TYPES | BUCKET_TYPES>(
  agg: SchemaConfig<T>,
  dataView: DataView,
  isSplit: boolean = false
) => {
  if (!agg.aggParams || !isSupprtedBucketAgg(agg)) {
    return null;
  }
  return getBucketColumns(agg.aggType, agg.aggParams, getLabel(agg), dataView, isSplit);
};
