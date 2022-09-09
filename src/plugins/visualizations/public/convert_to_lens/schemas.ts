/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { Column } from '../../common';
import { convertMetricToColumns } from '../../common/convert_to_lens/lib/metrics';
import { convertBucketToColumns } from '../../common/convert_to_lens/lib/buckets';
import {
  getCutomBucketsFromSiblingAggs,
  isSiblingPipeline,
} from '../../common/convert_to_lens/lib/utils';
import { Vis } from '../types';
import { getVisSchemas, Schemas } from '../vis_schemas';

export function isReferenced(columns: Column[], columnId: string) {
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
  metricColumns: Column[],
  dropEmptyRowsInDateHistogram: boolean = false
) => {
  const columns: Column[] = [];
  for (const key of keys) {
    if (visSchemas[key] && visSchemas[key]?.length) {
      const bucketColumns = visSchemas[key]?.flatMap((m) =>
        convertBucketToColumns(m, dataView, isSplit, metricColumns, dropEmptyRowsInDateHistogram)
      );
      if (!bucketColumns || bucketColumns.includes(null)) {
        return null;
      }
      columns.push(...(bucketColumns as Column[]));
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

  const customBuckets = getCutomBucketsFromSiblingAggs(visSchemas.metric);

  // doesn't support sibbling pipeline aggs with different bucket aggs
  if (customBuckets.length > 1) {
    return null;
  }

  const metricColumns = visSchemas.metric.flatMap((m) => convertMetricToColumns(m, dataView));

  if (metricColumns.includes(null)) {
    return null;
  }
  const metrics = metricColumns as Column[];
  const customBucketColumns = [];

  if (customBuckets.length) {
    const customBucketColumn = convertBucketToColumns(
      customBuckets[0],
      dataView,
      false,
      metricColumns as Column[],
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
    metricColumns as Column[],
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
    metricColumns as Column[],
    config?.dropEmptyRowsInDateHistogram
  );
  if (!splitBucketColumns) {
    return null;
  }

  const columns = [...metrics, ...bucketColumns, ...splitBucketColumns, ...customBucketColumns];
  const columnsWithoutReferenced = columns.filter(
    ({ columnId }) => !isReferenced(columns, columnId)
  );
  return {
    metrics: metrics.map(({ columnId }) => columnId),
    buckets: [...bucketColumns, ...splitBucketColumns, ...customBucketColumns].map(
      ({ columnId }) => columnId
    ),
    bucketCollapseFn: getBucketCollapseFn(visSchemas),
    columnsWithoutReferenced,
    columns,
  };
};
