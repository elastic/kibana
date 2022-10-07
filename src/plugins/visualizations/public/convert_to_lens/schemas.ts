/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPES, TimefilterContract } from '@kbn/data-plugin/public';
import { AggBasedColumn, PercentageModeConfig, SchemaConfig } from '../../common';
import { convertMetricToColumns } from '../../common/convert_to_lens/lib/metrics';
import { getCustomBucketsFromSiblingAggs } from '../../common/convert_to_lens/lib/utils';
import { BucketColumn } from '../../common/convert_to_lens/lib';
import type { Vis } from '../types';
import { getVisSchemas, Schemas } from '../vis_schemas';
import {
  getBucketCollapseFn,
  getBucketColumns,
  getCustomBuckets,
  getColumnIds,
  getColumnsWithoutReferenced,
  getMetricsWithoutDuplicates,
  isValidVis,
  sortColumns,
} from './utils';

const areVisSchemasValid = (visSchemas: Schemas, unsupported: Array<keyof Schemas>) => {
  const usedUnsupportedSchemas = unsupported.filter(
    (schema) => visSchemas[schema] && visSchemas[schema]?.length
  );
  return !usedUnsupportedSchemas.length;
};

export const getColumnsFromVis = <T>(
  vis: Vis<T>,
  timefilter: TimefilterContract,
  dataView: DataView,
  {
    splits = [],
    buckets = [],
    unsupported = [],
  }: {
    splits?: Array<keyof Schemas>;
    buckets?: Array<keyof Schemas>;
    unsupported?: Array<keyof Schemas>;
  } = {},
  config?: {
    dropEmptyRowsInDateHistogram?: boolean;
    supportMixedSiblingPipelineAggs?: boolean;
  } & (PercentageModeConfig | void)
) => {
  const { dropEmptyRowsInDateHistogram, ...percentageModeConfig } = config ?? {
    isPercentageMode: false,
  };
  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  if (
    !isValidVis(visSchemas, config?.supportMixedSiblingPipelineAggs) ||
    !areVisSchemasValid(visSchemas, unsupported)
  ) {
    return null;
  }

  const customBucketsWithMetricIds = getCustomBucketsFromSiblingAggs(visSchemas.metric);

  // doesn't support sibbling pipeline aggs with different bucket aggs
  if (!config?.supportMixedSiblingPipelineAggs && customBucketsWithMetricIds.length > 1) {
    return null;
  }

  const metricsWithoutDuplicates = getMetricsWithoutDuplicates(visSchemas.metric);
  const aggs = metricsWithoutDuplicates as Array<SchemaConfig<METRIC_TYPES>>;

  const metricColumns = aggs.flatMap((m) =>
    convertMetricToColumns(m, dataView, aggs, percentageModeConfig)
  );

  if (metricColumns.includes(null)) {
    return null;
  }
  const metrics = metricColumns as AggBasedColumn[];

  const { customBucketColumns, customBucketsMap } = getCustomBuckets(
    customBucketsWithMetricIds,
    metrics,
    dataView,
    aggs,
    config?.dropEmptyRowsInDateHistogram
  );

  if (customBucketColumns.includes(null)) {
    return null;
  }

  const bucketColumns = getBucketColumns(
    visSchemas,
    buckets,
    dataView,
    false,
    metricColumns as AggBasedColumn[],
    dropEmptyRowsInDateHistogram
  );
  if (!bucketColumns) {
    return null;
  }

  const splitBucketColumns = getBucketColumns(
    visSchemas,
    splits,
    dataView,
    true,
    metricColumns as AggBasedColumn[],
    dropEmptyRowsInDateHistogram
  );
  if (!splitBucketColumns) {
    return null;
  }

  const columns = sortColumns(
    [
      ...metrics,
      ...bucketColumns,
      ...splitBucketColumns,
      ...(customBucketColumns as BucketColumn[]),
    ],
    visSchemas,
    [...buckets, ...splits],
    metricsWithoutDuplicates
  );

  const columnsWithoutReferenced = getColumnsWithoutReferenced(columns);

  return {
    metrics: getColumnIds(columnsWithoutReferenced.filter((с) => !с.isBucketed)),
    buckets: {
      all: getColumnIds(columnsWithoutReferenced.filter((c) => c.isBucketed)),
      customBuckets: customBucketsMap,
    },
    bucketCollapseFn: getBucketCollapseFn(
      visSchemas.metric,
      customBucketColumns as BucketColumn[],
      customBucketsMap,
      metrics
    ),
    columnsWithoutReferenced,
    columns,
  };
};
