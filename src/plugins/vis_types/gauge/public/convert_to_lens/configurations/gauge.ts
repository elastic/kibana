/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { Column, GaugeVisConfiguration } from '@kbn/visualizations-plugin/common';
import { GaugeVisParams } from '../../types';

export const getConfigurationForGauge = (
  layerId: string,
  params: GaugeVisParams,
  palette: PaletteOutput<CustomPaletteParams> | undefined,
  {
    metrics,
    buckets,
    columnsWithoutReferenced,
    bucketCollapseFn,
  }: {
    metrics: string[];
    buckets: string[];
    columnsWithoutReferenced: Column[];
    bucketCollapseFn?: Record<string, string | undefined>;
  }
): GaugeVisConfiguration => {
  const [metricAccessor] = metrics;
  return {
    layerId,
    layerType: 'data',
    palette,
    metricAccessor,
    shape: 'horizontalBullet',
    ticksPosition: 'bands',
    labelMajorMode: 'auto',
  };
};
