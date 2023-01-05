/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LastValueParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { CommonColumnsConverterArgs, LastValueColumn } from './types';
import type { Metric } from '../../../../common/types';
import { createColumn, getFormat } from './column';

export const convertToLastValueParams = (metric: Metric): LastValueParams => ({
  sortField: metric.order_by,
  showArrayValues: false,
});

export const convertToLastValueColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
): LastValueColumn | null => {
  const currentMetric = metrics[metrics.length - 1];
  // We can only support top_hit with size 1
  if (
    (currentMetric?.size && Number(currentMetric?.size) !== 1) ||
    currentMetric?.order === 'asc'
  ) {
    return null;
  }

  const field = dataView.getFieldByName(currentMetric.field ?? 'document');
  if (!field) {
    return null;
  }

  return {
    operationType: 'last_value',
    sourceField: field.name ?? 'document',
    ...createColumn(series, currentMetric, undefined, {
      reducedTimeRange,
      timeShift: series.offset_time,
    }),
    params: {
      ...convertToLastValueParams(currentMetric),
      ...getFormat(series),
    },
  };
};
