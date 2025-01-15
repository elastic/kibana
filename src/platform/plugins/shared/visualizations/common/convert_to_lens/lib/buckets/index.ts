/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BUCKET_TYPES, IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { AggBasedColumn, SchemaConfig } from '../../..';
import {
  CommonBucketConverterArgs,
  convertToDateHistogramColumn,
  convertToFiltersColumn,
  convertToTermsColumn,
  convertToRangeColumn,
} from '../convert';
import { getFieldNameFromField, getLabel, isSchemaConfig } from '../utils';

export type BucketAggs =
  | BUCKET_TYPES.TERMS
  | BUCKET_TYPES.SIGNIFICANT_TERMS
  | BUCKET_TYPES.DATE_HISTOGRAM
  | BUCKET_TYPES.FILTERS
  | BUCKET_TYPES.RANGE
  | BUCKET_TYPES.HISTOGRAM;

const SUPPORTED_BUCKETS: string[] = [
  BUCKET_TYPES.TERMS,
  BUCKET_TYPES.SIGNIFICANT_TERMS,
  BUCKET_TYPES.DATE_HISTOGRAM,
  BUCKET_TYPES.FILTERS,
  BUCKET_TYPES.RANGE,
  BUCKET_TYPES.HISTOGRAM,
];

const isSupportedBucketAgg = (agg: SchemaConfig): agg is SchemaConfig<BucketAggs> => {
  return SUPPORTED_BUCKETS.includes(agg.aggType);
};

export const getBucketColumns = (
  { agg, dataView, metricColumns, aggs, visType }: CommonBucketConverterArgs<BucketAggs>,
  {
    label,
    isSplit = false,
    dropEmptyRowsInDateHistogram = false,
  }: { label: string; isSplit: boolean; dropEmptyRowsInDateHistogram: boolean }
) => {
  if (!agg.aggParams) {
    return null;
  }
  switch (agg.aggType) {
    case BUCKET_TYPES.DATE_HISTOGRAM:
      return convertToDateHistogramColumn(
        agg.aggId ?? '',
        agg.aggParams,
        dataView,
        isSplit,
        dropEmptyRowsInDateHistogram
      );
    case BUCKET_TYPES.FILTERS:
      return convertToFiltersColumn(agg.aggId ?? '', agg.aggParams, isSplit);
    case BUCKET_TYPES.RANGE:
    case BUCKET_TYPES.HISTOGRAM:
      return convertToRangeColumn(agg.aggId ?? '', agg.aggParams, label, dataView, isSplit);
    case BUCKET_TYPES.TERMS:
    case BUCKET_TYPES.SIGNIFICANT_TERMS:
      const fieldName = getFieldNameFromField(agg.aggParams.field);
      if (!fieldName) {
        return null;
      }
      const field = dataView.getFieldByName(fieldName);

      if (!field) {
        return null;
      }
      if (field.type !== 'date') {
        return convertToTermsColumn(
          agg.aggId ?? '',
          { agg, dataView, metricColumns, aggs, visType },
          label,
          isSplit
        );
      } else {
        return convertToDateHistogramColumn(
          agg.aggId ?? '',
          {
            field: fieldName,
          },
          dataView,
          isSplit,
          dropEmptyRowsInDateHistogram
        );
      }
  }

  return null;
};

export const convertBucketToColumns = (
  {
    agg,
    dataView,
    metricColumns,
    aggs,
    visType,
  }: {
    visType: string;
    agg: SchemaConfig | IAggConfig;
    dataView: DataView;
    metricColumns: AggBasedColumn[];
    aggs: Array<SchemaConfig<METRIC_TYPES>>;
  },
  isSplit: boolean = false,
  dropEmptyRowsInDateHistogram: boolean = false
) => {
  const currentAgg = isSchemaConfig(agg) ? agg : convertToSchemaConfig(agg);
  if (!currentAgg.aggParams || !isSupportedBucketAgg(currentAgg)) {
    return null;
  }
  return getBucketColumns(
    { agg: currentAgg, dataView, metricColumns, aggs, visType },
    {
      label: getLabel(currentAgg),
      isSplit,
      dropEmptyRowsInDateHistogram,
    }
  );
};
