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
import { Vis } from '../types';
import { getVisSchemas, Schemas } from '../vis_schemas';

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

  const metricColumns = visSchemas.metric.flatMap((m) => convertMetricToColumns(m, dataView));
  if (metricColumns.includes(null)) {
    return null;
  }

  for (const key of splits) {
    if (visSchemas[key]) {
      const bucketColumns = visSchemas[key]?.flatMap((m) =>
        convertBucketToColumns(m, dataView, true)
      );
      if (!bucketColumns || bucketColumns.includes(null)) {
        return null;
      }
    }
  }

  for (const key of buckets) {
    if (visSchemas[key]) {
      const bucketColumns = visSchemas[key]?.flatMap((m) => convertBucketToColumns(m, dataView));
      if (!bucketColumns || bucketColumns.includes(null)) {
        return null;
      }
    }
  }

  const columns = [...(metricColumns as Column[])];
  return columns;
};
