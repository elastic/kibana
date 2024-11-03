/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniqWith } from 'lodash';
import deepEqual from 'react-fast-compare';
import { Layer, Operations, TermsColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import {
  Layer as ExtendedLayer,
  excludeMetaFromColumn,
  ColumnsWithoutMeta,
  Column,
} from './lib/convert';
import { getSeriesAgg } from './lib/series';
import { Metric, Series } from '../../common/types';

export const excludeMetaFromLayers = (
  layers: Record<string, ExtendedLayer>
): Record<string, Layer> => {
  const newLayers: Record<string, Layer> = {};
  Object.entries(layers).forEach(([layerId, layer]) => {
    const columns = layer.columns.map(excludeMetaFromColumn);
    newLayers[layerId] = { ...layer, columns };
  });

  return newLayers;
};

const excludeColumnIdsFromBucket = (bucket: ColumnsWithoutMeta) => {
  const { columnId, ...restBucket } = bucket;
  if (bucket.operationType === Operations.TERMS) {
    const { orderBy, orderAgg, ...restParams } = bucket.params;
    let orderByWithoutColumn: Omit<TermsColumn['params']['orderBy'], 'columnId'> = orderBy;
    if ('columnId' in orderBy) {
      const { columnId: orderByColumnId, ...restOrderBy } = orderBy;
      orderByWithoutColumn = restOrderBy;
    }

    let orderAggWithoutColumn: Omit<TermsColumn['params']['orderAgg'], 'columnId'> | undefined =
      orderAgg;
    if (orderAgg) {
      const { columnId: cId, ...restOrderAgg } = orderAgg;
      orderAggWithoutColumn = restOrderAgg;
    }

    return {
      ...restBucket,
      params: {
        ...restParams,
        orderBy: orderByWithoutColumn,
        orderAgg: orderAggWithoutColumn,
      },
    };
  }
  return restBucket;
};

export const getUniqueBuckets = (buckets: ColumnsWithoutMeta[]) =>
  uniqWith(buckets, (bucket1, bucket2) => {
    if (bucket1.operationType !== bucket2.operationType) {
      return false;
    }

    const bucketWithoutColumnIds1 = excludeColumnIdsFromBucket(bucket1);
    const bucketWithoutColumnIds2 = excludeColumnIdsFromBucket(bucket2);

    return deepEqual(bucketWithoutColumnIds1, bucketWithoutColumnIds2);
  });

export const getMetricWithCollapseFn = (series: Series | undefined) => {
  if (!series) {
    return;
  }
  const { metrics, seriesAgg } = getSeriesAgg(series.metrics);
  const visibleMetric = metrics[metrics.length - 1];
  return { metric: visibleMetric, collapseFn: seriesAgg };
};

export const findMetricColumn = (metric: Metric | undefined, columns: Column[]) => {
  if (!metric) {
    return;
  }

  return columns.find((column) => 'meta' in column && column.meta.metricId === metric.id);
};
