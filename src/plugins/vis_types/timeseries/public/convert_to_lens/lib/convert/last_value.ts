/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  LastValueColumn,
  LastValueParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Metric, Series } from '../../../../common/types';
import { createColumn } from './column';

const convertToLastValueParams = (metric: Metric): LastValueParams | null =>
  metric.order_by
    ? {
        sortField: metric.order_by,
        showArrayValues: false,
      }
    : null;

export const convertToLastValueColumn = (
  series: Series,
  metrics: Metric[],
  dataView: DataView
): LastValueColumn | null => {
  const currentMetric = metrics[metrics.length - 1];
  // We can only support top_hit with size 1
  if (
    (currentMetric?.size && Number(currentMetric?.size) !== 1) ||
    currentMetric?.order === 'asc'
  ) {
    return null;
  }

  const params = convertToLastValueParams(currentMetric);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(currentMetric.field ?? 'document');
  if (!field) {
    return null;
  }

  return {
    operationType: 'last_value',
    sourceField: field.name ?? 'document',
    ...createColumn(series, currentMetric),
    params,
  };
};
