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
import { getCutomBucketsFromSiblingAggs } from '../../common/convert_to_lens/lib/utils';
import { Vis } from '../types';
import { getVisSchemas, Schemas } from '../vis_schemas';

const getBucketColumns = (
  visSchemas: Schemas,
  keys: Array<keyof Schemas>,
  dataView: DataView,
  isSplit: boolean,
  metricColumns: Column[]
) => {
  const columns: Column[] = [];
  for (const key of keys) {
    if (visSchemas[key] && visSchemas[key]?.length) {
      const bucketColumns = visSchemas[key]?.flatMap((m) =>
        convertBucketToColumns(m, dataView, isSplit, metricColumns)
      );
      if (!bucketColumns || bucketColumns.includes(null)) {
        return null;
      }
      columns.push(...(bucketColumns as Column[]));
    }
  }
  return columns;
};

export const getColumnsFromVis = <T>(
  vis: Vis<T>,
  timefilter: TimefilterContract,
  dataView: DataView,
  { splits, buckets }: { splits: Array<keyof Schemas>; buckets: Array<keyof Schemas> } = {
    splits: [],
    buckets: [],
  }
) => {
  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  const customBuckets = getCutomBucketsFromSiblingAggs(visSchemas.metric);

  // doesn't support sibbling pipeline aggs with different bucket aggs
  if (customBuckets.length > 1) {
    return null;
  }

  const metricColumns = visSchemas.metric.flatMap((m) => convertMetricToColumns(m, dataView));
  if (metricColumns.includes(null)) {
    return null;
  }

  const customBucketColumns = [];

  if (customBuckets.length) {
    const customBucketColumn = convertBucketToColumns(
      customBuckets[0],
      dataView,
      false,
      metricColumns as Column[]
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
    metricColumns as Column[]
  );
  if (!bucketColumns) {
    return null;
  }

  const splitBucketColumns = getBucketColumns(
    visSchemas,
    splits,
    dataView,
    true,
    metricColumns as Column[]
  );
  if (!splitBucketColumns) {
    return null;
  }

  const columns = [
    ...(metricColumns as Column[]),
    ...bucketColumns,
    ...splitBucketColumns,
    ...customBucketColumns,
  ];
  return columns;
};
