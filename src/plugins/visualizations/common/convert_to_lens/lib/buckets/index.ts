/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsTerms, BUCKET_TYPES, IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { SchemaConfig } from '../../..';
import {
  AggBasedColumn,
  CommonBucketConverterArgs,
  convertToDateHistogramColumn,
  convertToFiltersColumn,
  convertToTermsColumn,
} from '../convert';
import { getFieldNameFromField, getLabel, isSchemaConfig } from '../utils';

export type BucketAggs = BUCKET_TYPES.TERMS | BUCKET_TYPES.DATE_HISTOGRAM | BUCKET_TYPES.FILTERS;
const SUPPORTED_BUCKETS: string[] = [
  BUCKET_TYPES.TERMS,
  BUCKET_TYPES.DATE_HISTOGRAM,
  BUCKET_TYPES.FILTERS,
];

const isSupportedBucketAgg = (agg: SchemaConfig): agg is SchemaConfig<BucketAggs> => {
  return SUPPORTED_BUCKETS.includes(agg.aggType);
};

const getBucketColumns = (
  aggType: BUCKET_TYPES,
  { aggParams, dataView, metricColumns, aggs }: CommonBucketConverterArgs<BucketAggs>,
  {
    label,
    isSplit = false,
    dropEmptyRowsInDateHistogram = false,
  }: { label: string; isSplit: boolean; dropEmptyRowsInDateHistogram: boolean },
  aggId: string = ''
) => {
  switch (aggType) {
    case BUCKET_TYPES.DATE_HISTOGRAM:
      return convertToDateHistogramColumn(
        aggId,
        aggParams,
        dataView,
        isSplit,
        dropEmptyRowsInDateHistogram
      );
    case BUCKET_TYPES.FILTERS:
      return convertToFiltersColumn(aggId, aggParams, isSplit);
    case BUCKET_TYPES.TERMS:
      const fieldName = getFieldNameFromField((aggParams as AggParamsTerms).field);
      if (!fieldName) {
        return null;
      }
      const field = dataView.getFieldByName(fieldName);

      if (!field) {
        return null;
      }
      if (field.type !== 'date') {
        return convertToTermsColumn(
          aggId,
          { aggParams: aggParams as AggParamsTerms, dataView, metricColumns, aggs },
          label,
          isSplit
        );
      } else {
        return convertToDateHistogramColumn(
          aggId,
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
  }: {
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
  const { aggParams } = currentAgg;
  return getBucketColumns(
    currentAgg.aggType,
    { aggParams, dataView, metricColumns, aggs },
    {
      label: getLabel(currentAgg),
      isSplit,
      dropEmptyRowsInDateHistogram,
    },
    currentAgg.aggId
  );
};
