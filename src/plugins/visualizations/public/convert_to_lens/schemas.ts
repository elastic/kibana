/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPES, TimefilterContract } from '@kbn/data-plugin/public';
import { AggBasedColumn, SchemaConfig, SupportedAggregation } from '../../common';
import { convertMetricToColumns } from '../../common/convert_to_lens/lib/metrics';
import { convertBucketToColumns } from '../../common/convert_to_lens/lib/buckets';
import {
  getCutomBucketsFromSiblingAggs,
  isSiblingPipeline,
} from '../../common/convert_to_lens/lib/utils';
import { Vis } from '../types';
import { getVisSchemas, Schemas } from '../vis_schemas';

export function isReferenced(columns: AggBasedColumn[], columnId: string) {
  const allReferences = Object.values(columns).flatMap((col) =>
    'references' in col ? col.references : []
  );
  return allReferences.includes(columnId);
}

const getBucketCollapseFn = (visSchemas: Schemas) => {
  return visSchemas.metric.find((m) => isSiblingPipeline(m))?.aggType.split('_')[0];
};

const getBucketColumns = (
  visSchemas: Schemas,
  keys: Array<keyof Schemas>,
  dataView: DataView,
  isSplit: boolean,
  metricColumns: AggBasedColumn[],
  dropEmptyRowsInDateHistogram: boolean = false
) => {
  const columns: AggBasedColumn[] = [];
  for (const key of keys) {
    if (visSchemas[key] && visSchemas[key]?.length) {
      const bucketColumns = visSchemas[key]?.flatMap((m) =>
        convertBucketToColumns(
          {
            agg: m,
            dataView,
            metricColumns,
            aggs: visSchemas.metric as Array<SchemaConfig<METRIC_TYPES>>,
          },
          isSplit,
          dropEmptyRowsInDateHistogram
        )
      );
      if (!bucketColumns || bucketColumns.includes(null)) {
        return null;
      }
      columns.push(...(bucketColumns as AggBasedColumn[]));
    }
  }
  return columns;
};

const isValidVis = (visSchemas: Schemas, splits: Array<keyof Schemas>) => {
  const { metric } = visSchemas;
  const siblingPipelineAggs = metric.filter((m) => isSiblingPipeline(m));

  if (!siblingPipelineAggs.length) {
    return true;
  }

  // doesn't support mixed sibling pipeline aggregations
  if (siblingPipelineAggs.some((agg) => agg.aggType !== siblingPipelineAggs[0].aggType)) {
    return false;
  }

  const splitAggs = splits.flatMap((split) => visSchemas[split]).filter(Boolean);
  if (!splitAggs.length) {
    return true;
  }
  return false;
};

export const getColumnsFromVis = <T>(
  vis: Vis<T>,
  timefilter: TimefilterContract,
  dataView: DataView,
  { splits, buckets }: { splits: Array<keyof Schemas>; buckets: Array<keyof Schemas> } = {
    splits: [],
    buckets: [],
  },
  config?: {
    dropEmptyRowsInDateHistogram?: boolean;
  }
) => {
  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  if (!isValidVis(visSchemas, [...buckets, ...splits])) {
    return null;
  }

  const updatedMetrics = visSchemas.metric.reduce<SchemaConfig<SupportedAggregation>[]>(
    (acc, metric) => {
      if (metric.aggId && !acc.some((m) => m.aggId === metric.aggId)) {
        acc.push(metric);
      }
      return acc;
    },
    []
  );

  const sortMap: Record<string, number> = ['metric', ...buckets, ...splits].reduce((acc, key) => {
    return {
      ...acc,
      ...(key === 'metric' ? updatedMetrics : visSchemas[key])?.reduce((newAcc, schema) => {
        newAcc[schema.aggId] = schema.accessor;
        return newAcc;
      }, {}),
    };
  }, {});

  const customBuckets = getCutomBucketsFromSiblingAggs(visSchemas.metric);

  // doesn't support sibbling pipeline aggs with different bucket aggs
  if (customBuckets.length > 1) {
    return null;
  }

  const aggs = updatedMetrics as Array<SchemaConfig<METRIC_TYPES>>;

  const metricColumns = updatedMetrics.flatMap((m) => convertMetricToColumns(m, dataView, aggs));

  if (metricColumns.includes(null)) {
    return null;
  }
  const metrics = metricColumns as AggBasedColumn[];
  const customBucketColumns = [];

  if (customBuckets.length) {
    const customBucketColumn = convertBucketToColumns(
      { agg: customBuckets[0], dataView, metricColumns: metrics, aggs },
      false,
      config?.dropEmptyRowsInDateHistogram
    );
    if (!customBucketColumn) {
      return null;
    }
    customBucketColumns.push(customBucketColumn);
  }

  const bucketColumns = getBucketColumns(
    visSchemas,
    buckets,
    dataView,
    false,
    metricColumns as AggBasedColumn[],
    config?.dropEmptyRowsInDateHistogram
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
    config?.dropEmptyRowsInDateHistogram
  );
  if (!splitBucketColumns) {
    return null;
  }

  const columns = [
    ...metrics,
    ...bucketColumns,
    ...splitBucketColumns,
    ...customBucketColumns,
  ].sort(
    (a, b) =>
      Number(sortMap[a.meta.aggId.split('-')[0]]) - Number(sortMap[b.meta.aggId.split('-')[0]])
  );
  const columnsWithoutReferenced = columns.filter(
    ({ columnId }) => !isReferenced(columns, columnId)
  );
  return {
    metrics: metrics
      .map(({ columnId }) => columnId)
      .filter((columnId) => !isReferenced(columns, columnId)),
    buckets: columns.filter((c) => c.isBucketed).map(({ columnId }) => columnId),
    bucketCollapseFn: getBucketCollapseFn(visSchemas),
    columnsWithoutReferenced,
    columns,
  };
};
