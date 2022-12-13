/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CollapseFunction } from '@kbn/visualizations-plugin/common';
import type { Metric } from '../../../../common/types';

const functionMap: Partial<Record<string, CollapseFunction>> = {
  mean: 'avg',
  min: 'min',
  max: 'max',
  sum: 'sum',
};

export const getSeriesAgg = (metrics: Metric[]) => {
  const lastMetric = metrics[metrics.length - 1];

  if (lastMetric.type === 'series_agg' && lastMetric.function && functionMap[lastMetric.function]) {
    return {
      metrics: metrics.slice(0, -1),
      seriesAgg: functionMap[lastMetric.function],
    };
  } else {
    return {
      metrics,
      seriesAgg: undefined,
    };
  }
};
