/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { AggBasedColumn, SchemaConfig, SupportedAggregation } from '../../common';
import { convertBucketToColumns } from '../../common/convert_to_lens/lib/buckets';
import { isSiblingPipeline } from '../../common/convert_to_lens/lib/utils';
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
  customBucketColumns: AggBasedColumn[]
) => {
  const collapseFn = metrics.find((m) => isSiblingPipeline(m))?.aggType.split('_')[0];
  return customBucketColumns.length
    ? {
        [customBucketColumns[0].columnId]: collapseFn,
      }
    : {};
};

export const getBucketColumns = (
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

export const isValidVis = (visSchemas: Schemas) => {
  const { metric } = visSchemas;
  const siblingPipelineAggs = metric.filter((m) => isSiblingPipeline(m));

  if (!siblingPipelineAggs.length) {
    return true;
  }

  // doesn't support mixed sibling pipeline aggregations
  if (siblingPipelineAggs.some((agg) => agg.aggType !== siblingPipelineAggs[0].aggType)) {
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
            newAcc[schema.aggId] = schema.accessor;
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
