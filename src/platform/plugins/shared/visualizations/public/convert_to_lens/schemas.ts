/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { IAggConfig, METRIC_TYPES, TimefilterContract } from '@kbn/data-plugin/public';
import { AggBasedColumn, PercentageModeConfig, SchemaConfig, VisParams } from '../../common';
import { convertMetricToColumns } from '../../common/convert_to_lens/lib/metrics';
import {
  getAggIdAndValue,
  getCustomBucketsFromSiblingAggs,
} from '../../common/convert_to_lens/lib/utils';
import { BucketColumn } from '../../common/convert_to_lens/lib';
import type { Vis } from '../types';
import { getVisSchemas, Schemas } from '../vis_schemas';
import {
  getBucketCollapseFn,
  getBucketColumns,
  getCustomBucketColumns,
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

const createLayer = (
  visType: string,
  visSchemas: Schemas,
  allMetrics: Array<SchemaConfig<METRIC_TYPES>>,
  metricsForLayer: Array<SchemaConfig<METRIC_TYPES>>,
  customBucketsWithMetricIds: Array<{
    customBucket: IAggConfig;
    metricIds: string[];
  }>,
  dataView: DataView,
  {
    splits = [],
    buckets = [],
  }: {
    splits?: Array<keyof Schemas>;
    buckets?: Array<keyof Schemas>;
  } = {},
  percentageModeConfig: PercentageModeConfig,
  dropEmptyRowsInDateHistogram?: boolean
) => {
  const metricColumns = metricsForLayer.flatMap((m) =>
    convertMetricToColumns({ agg: m, dataView, aggs: allMetrics, visType }, percentageModeConfig)
  );
  if (metricColumns.includes(null)) {
    return null;
  }
  const metricColumnsWithoutNull = metricColumns as AggBasedColumn[];

  const { customBucketColumns, customBucketsMap } = getCustomBucketColumns(
    visType,
    customBucketsWithMetricIds,
    metricColumnsWithoutNull,
    dataView,
    allMetrics,
    dropEmptyRowsInDateHistogram
  );

  if (customBucketColumns.includes(null)) {
    return null;
  }

  const bucketColumns = getBucketColumns(
    visType,
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
    visType,
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
      ...metricColumnsWithoutNull,
      ...bucketColumns,
      ...splitBucketColumns,
      ...(customBucketColumns as BucketColumn[]),
    ],
    visSchemas,
    [...buckets, ...splits],
    metricsForLayer
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
      metricColumnsWithoutNull
    ),
    columnsWithoutReferenced,
    columns,
  };
};

export const getColumnsFromVis = <TVisParams extends VisParams>(
  vis: Vis<TVisParams>,
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
  } & (PercentageModeConfig | void),
  series?: Array<{ metrics: string[] }>
) => {
  const { dropEmptyRowsInDateHistogram, supportMixedSiblingPipelineAggs, ...percentageModeConfig } =
    config ?? {
      isPercentageMode: false,
    };
  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  if (
    !isValidVis(visSchemas, supportMixedSiblingPipelineAggs) ||
    !areVisSchemasValid(visSchemas, unsupported)
  ) {
    return null;
  }

  const customBucketsWithMetricIds = getCustomBucketsFromSiblingAggs(visSchemas.metric);

  // doesn't support sibbling pipeline aggs with different bucket aggs
  if (!supportMixedSiblingPipelineAggs && customBucketsWithMetricIds.length > 1) {
    return null;
  }

  const metricsWithoutDuplicates = getMetricsWithoutDuplicates(visSchemas.metric);
  const aggs = metricsWithoutDuplicates as Array<SchemaConfig<METRIC_TYPES>>;
  const layers = [];

  if (series && series.length) {
    for (const { metrics: metricAggIds } of series) {
      const metricAggIdsLookup = new Set(metricAggIds);
      const metrics = aggs.filter(
        (agg) => agg.aggId && metricAggIdsLookup.has(getAggIdAndValue(agg.aggId)[0])
      );
      const customBucketsForLayer = customBucketsWithMetricIds.filter((c) =>
        c.metricIds.some((m) => metricAggIdsLookup.has(m))
      );
      const layer = createLayer(
        vis.type.name,
        visSchemas,
        aggs,
        metrics,
        customBucketsForLayer,
        dataView,
        { splits, buckets },
        percentageModeConfig,
        dropEmptyRowsInDateHistogram
      );
      if (!layer) {
        return null;
      }
      layers.push(layer);
    }
  } else {
    const layer = createLayer(
      vis.type.name,
      visSchemas,
      aggs,
      aggs,
      customBucketsWithMetricIds,
      dataView,
      { splits, buckets },
      percentageModeConfig,
      dropEmptyRowsInDateHistogram
    );
    if (!layer) {
      return null;
    }
    layers.push(layer);
  }

  return layers;
};
