/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/public';
import {
  AggBasedColumn,
  CollapseFunction,
  isCollapseFunction,
  SchemaConfig,
  SupportedAggregation,
} from '../../common';
import { convertBucketToColumns } from '../../common/convert_to_lens/lib/buckets';
import { isSiblingPipeline } from '../../common/convert_to_lens/lib/utils';
import { BucketColumn } from '../../common/convert_to_lens/lib';
import { Schemas } from '../vis_schemas';

export const isReferenced = (columnId: string, references: string[]) =>
  references.includes(columnId);

export const getColumnsWithoutReferenced = (columns: AggBasedColumn[]) => {
  const references = Object.values(columns).flatMap((col) =>
    'references' in col ? col.references : []
  );
  return columns.filter(({ columnId }) => !isReferenced(columnId, references));
};

export const getBucketCollapseFn = (
  metrics: Array<SchemaConfig<SupportedAggregation>>,
  customBucketColumns: AggBasedColumn[],
  customBucketsMap: Record<string, string>,
  metricColumns: AggBasedColumn[]
) => {
  const collapseFnMap: Record<CollapseFunction, string[]> = {
    min: [],
    max: [],
    sum: [],
    avg: [],
  };
  customBucketColumns.forEach((bucket) => {
    const metricColumnsIds = Object.keys(customBucketsMap).filter(
      (key) => customBucketsMap[key] === bucket.columnId
    );
    metricColumnsIds.forEach((metricColumnsId) => {
      const metricColumn = metricColumns.find((c) => c.columnId === metricColumnsId)!;
      const collapseFn = metrics
        .find((m) => m.aggId === metricColumn.meta.aggId)
        ?.aggType.split('_')[0];

      if (isCollapseFunction(collapseFn)) {
        if (collapseFn) {
          collapseFnMap[collapseFn].push(bucket.columnId);
        }
      }
    });
  });
  return collapseFnMap;
};

export const getBucketColumns = (
  visType: string,
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
            visType,
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

export const isValidVis = (visSchemas: Schemas, supportMixedSiblingPipelineAggs?: boolean) => {
  const { metric } = visSchemas;
  const siblingPipelineAggs = metric.filter((m) => isSiblingPipeline(m));

  if (!siblingPipelineAggs.length) {
    return true;
  }

  // doesn't support mixed sibling pipeline aggregations
  if (
    siblingPipelineAggs.some((agg) => agg.aggType !== siblingPipelineAggs[0].aggType) &&
    !supportMixedSiblingPipelineAggs
  ) {
    return false;
  }

  return true;
};

export const getMetricsWithoutDuplicates = (metrics: Array<SchemaConfig<SupportedAggregation>>) =>
  metrics.reduce<Array<SchemaConfig<SupportedAggregation>>>((acc, metric) => {
    if (metric.aggId && !acc.some((m) => m.aggId === metric.aggId)) {
      acc.push(metric);
    }
    return acc;
  }, []);

export const sortColumns = (
  columns: AggBasedColumn[],
  visSchemas: Schemas,
  bucketsAndSplitsKeys: Array<keyof Schemas>,
  metricsWithoutDuplicates: Array<SchemaConfig<SupportedAggregation>>
) => {
  const aggOrderMap: Record<string, number> = ['metric', ...bucketsAndSplitsKeys].reduce(
    (acc, key) => {
      return {
        ...acc,
        ...(key === 'metric' ? metricsWithoutDuplicates : visSchemas[key])?.reduce(
          (newAcc, schema) => {
            // metrics should always have sort more than buckets
            newAcc[schema.aggId] = key === 'metric' ? schema.accessor : 1000 + schema.accessor;
            return newAcc;
          },
          {}
        ),
      };
    },
    {}
  );

  return columns.sort(
    (a, b) =>
      Number(aggOrderMap[a.meta.aggId.split('-')[0]]) -
      Number(aggOrderMap[b.meta.aggId.split('-')[0]])
  );
};

export const getColumnIds = (columns: AggBasedColumn[]) => columns.map(({ columnId }) => columnId);

export const getCustomBucketColumns = (
  visType: string,
  customBucketsWithMetricIds: Array<{
    customBucket: IAggConfig;
    metricIds: string[];
  }>,
  metricColumns: AggBasedColumn[],
  dataView: DataView,
  aggs: Array<SchemaConfig<METRIC_TYPES>>,
  dropEmptyRowsInDateHistogram?: boolean
) => {
  const customBucketColumns: Array<BucketColumn | null> = [];
  const customBucketsMap: Record<string, string> = {};
  customBucketsWithMetricIds.forEach((customBucketWithMetricIds) => {
    const customBucketColumn = convertBucketToColumns(
      { agg: customBucketWithMetricIds.customBucket, dataView, metricColumns, aggs, visType },
      true,
      dropEmptyRowsInDateHistogram
    );
    customBucketColumns.push(customBucketColumn);
    if (customBucketColumn) {
      customBucketWithMetricIds.metricIds.forEach((metricAggId) => {
        const metricColumnId = metricColumns.find(
          (metricColumn) => metricColumn?.meta.aggId === metricAggId
        )?.columnId;
        if (metricColumnId) {
          customBucketsMap[metricColumnId] = customBucketColumn.columnId;
        }
      });
    }
  });
  return { customBucketColumns, customBucketsMap };
};
