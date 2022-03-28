/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition } from 'lodash';
import type { CommonXYDataLayerConfigResult, CommonXYLayerConfigResult } from '../../common';
import { isStackedChart } from './state';
import { isAnnotationsLayer, isDataLayer } from './visualization';

export function computeOverallDataDomain(
  layers: CommonXYLayerConfigResult[],
  accessorIds: string[],
  allowStacking: boolean = true
) {
  const accessorMap = new Set(accessorIds);
  let min: number | undefined;
  let max: number | undefined;
  const [stacked, unstacked] = partition(
    layers,
    (layer) => isDataLayer(layer) && isStackedChart(layer.seriesType) && allowStacking
  );

  for (const layer of unstacked) {
    if (!isAnnotationsLayer(layer) && layer.table) {
      for (const accessor of layer.accessors) {
        if (accessorMap.has(accessor)) {
          for (const row of layer.table.rows) {
            const value = row[accessor];
            if (typeof value === 'number') {
              // when not stacked, do not keep the 0
              max = max != null ? Math.max(value, max) : value;
              min = min != null ? Math.min(value, min) : value;
            }
          }
        }
      }
    }
  }
  // stacked can span multiple layers, so compute an overall max/min by bucket
  const stackedResults: Record<string, number> = {};
  for (const { accessors, xAccessor, table } of stacked as CommonXYDataLayerConfigResult[]) {
    if (table) {
      for (const accessor of accessors) {
        if (accessorMap.has(accessor)) {
          for (const row of table.rows) {
            const value = row[accessor];
            // start with a shared bucket
            let bucket = 'shared';
            // but if there's an xAccessor use it as new bucket system
            if (xAccessor) {
              bucket = row[xAccessor];
            }
            if (typeof value === 'number') {
              stackedResults[bucket] = stackedResults[bucket] ?? 0;
              stackedResults[bucket] += value;
            }
          }
        }
      }
    }
  }

  for (const value of Object.values(stackedResults)) {
    // for stacked extents keep 0 in view
    max = Math.max(value, max || 0, 0);
    min = Math.min(value, min || 0, 0);
  }

  return { min, max };
}
