/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqWith } from 'lodash';
import deepEqual from 'react-fast-compare';
import { Layer, Operations } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { Layer as ExtendedLayer, excludeMetaFromColumn, ColumnsWithoutMeta } from '../lib/convert';

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

export const getUniqueBuckets = (buckets: ColumnsWithoutMeta[]) =>
  uniqWith(buckets, (bucket1, bucket2) => {
    if (bucket1.operationType !== bucket2.operationType) {
      return false;
    }

    const { columnId, params, ...restBucket } = bucket1;
    const { columnId: columnId2, params: params2, ...restBucket2 } = bucket2;
    if (bucket1.operationType === Operations.TERMS && bucket2.operationType === Operations.TERMS) {
      const { orderAgg, ...restParams } = bucket1.params;
      const { orderAgg: orderAgg2, ...restParams2 } = bucket2.params;
      if (orderAgg && orderAgg2) {
        const { columnId: cId, ...restOrderAgg } = orderAgg;
        const { columnId: cId2, ...restOrderAgg2 } = orderAgg2;

        return (
          deepEqual(restBucket, restBucket2) &&
          deepEqual(restParams, restParams2) &&
          deepEqual(restOrderAgg, restOrderAgg2)
        );
      }
      if (orderAgg || orderAgg2) {
        return false;
      }
      return deepEqual(restBucket, restBucket2) && deepEqual(restParams, restParams2);
    }

    return deepEqual(restBucket, restBucket2) && deepEqual(params, params2);
  });
