/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import {
  CollapseFunction,
  Column,
  MetricVisConfiguration,
} from '@kbn/visualizations-plugin/common';
import { GaugeVisParams } from '../../types';

export const getConfiguration = (
  layerId: string,
  { gauge }: GaugeVisParams,
  palette: PaletteOutput<CustomPaletteParams> | undefined,
  {
    metrics,
    buckets,
    maxAccessor,
    columnsWithoutReferenced,
    bucketCollapseFn,
  }: {
    metrics: string[];
    buckets: {
      all: string[];
      customBuckets: Record<string, string>;
    };
    maxAccessor: string;
    columnsWithoutReferenced: Column[];
    bucketCollapseFn?: Record<CollapseFunction, string[]>;
  }
): MetricVisConfiguration => {
  const [metricAccessor] = metrics;
  const [breakdownByAccessor] = buckets.all;
  const collapseFn = bucketCollapseFn
    ? (Object.keys(bucketCollapseFn).find((key) =>
        bucketCollapseFn[key as CollapseFunction].includes(breakdownByAccessor)
      ) as CollapseFunction)
    : undefined;
  return {
    layerId,
    layerType: 'data',
    palette,
    metricAccessor,
    breakdownByAccessor,
    maxAccessor,
    showBar: Boolean(maxAccessor),
    collapseFn,
    subtitle: gauge.labels.show && gauge.style.subText ? gauge.style.subText : undefined,
  };
};
