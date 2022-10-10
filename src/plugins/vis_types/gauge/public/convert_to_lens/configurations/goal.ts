/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { Column, MetricVisConfiguration } from '@kbn/visualizations-plugin/common';

export const getConfiguration = (
  layerId: string,
  palette: PaletteOutput<CustomPaletteParams> | undefined,
  {
    metrics,
    buckets,
    maxAccessor,
    columnsWithoutReferenced,
    bucketCollapseFn,
  }: {
    metrics: string[];
    buckets: string[];
    maxAccessor: string;
    columnsWithoutReferenced: Column[];
    bucketCollapseFn?: Record<string, string | undefined>;
  }
): MetricVisConfiguration => {
  const [metricAccessor] = metrics;
  const [breakdownByAccessor] = buckets;
  return {
    layerId,
    layerType: 'data',
    palette,
    metricAccessor,
    breakdownByAccessor,
    maxAccessor,
    collapseFn: Object.values(bucketCollapseFn ?? {})[0],
  };
};
