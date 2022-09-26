/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StaticValueParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { CommonColumnsConverterArgs, StaticValueColumn } from './types';
import type { Metric } from '../../../../common/types';
import { createColumn, getFormat } from './column';

export const convertToStaticValueParams = ({ value }: Metric): StaticValueParams => ({
  value,
});

export const convertToStaticValueColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  {
    visibleSeriesCount = 0,
    reducedTimeRange,
  }: { visibleSeriesCount?: number; reducedTimeRange?: string } = {}
): StaticValueColumn | null => {
  // Lens support reference lines only when at least one layer data exists
  if (visibleSeriesCount === 1) {
    return null;
  }
  const currentMetric = metrics[metrics.length - 1];
  return {
    operationType: 'static_value',
    references: [],
    ...createColumn(series, currentMetric, undefined, { reducedTimeRange }),
    params: {
      ...convertToStaticValueParams(currentMetric),
      ...getFormat(series),
    },
  };
};
