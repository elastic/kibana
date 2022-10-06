/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column, MetricVisConfiguration } from '@kbn/visualizations-plugin/common';
import { PercentageModeConfig } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { VisParams } from '../../types';
import { getPalette } from './palette';

export const getPercentageModeConfig = (params: VisParams): PercentageModeConfig => {
  if (!params.metric.percentageMode) {
    return { isPercentageMode: false };
  }
  const { colorsRange } = params.metric;
  return {
    isPercentageMode: true,
    min: colorsRange[0].from,
    max: colorsRange[colorsRange.length - 1].to,
  };
};

export const getConfiguration = (
  layerId: string,
  params: VisParams,
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
): MetricVisConfiguration => {
  const [metricAccessor] = metrics;
  const [breakdownByAccessor] = buckets;
  return {
    layerId,
    layerType: 'data',
    palette: getPalette(params),
    metricAccessor,
    breakdownByAccessor,
    collapseFn: Object.values(bucketCollapseFn ?? {})[0],
  };
};
