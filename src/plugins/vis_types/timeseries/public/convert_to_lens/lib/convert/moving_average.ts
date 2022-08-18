/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DerivativeColumn,
  MovingAverageColumn,
  MovingAverageParams,
  Operations,
} from '@kbn/visualizations-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Metric, Series } from '../../../../common/types';
import { createColumn } from './column';

const convertToMovingAverageParams = ({ window }: Metric): MovingAverageParams => ({
  window: window ?? 0,
});

export const createMovingAverageOrDerivativeColumn = (
  aggregation: typeof Operations.DIFFERENCES | typeof Operations.MOVING_AVERAGE,
  series: Series,
  metric: Metric,
  dataView: DataView,
  references: string[] = []
) => {
  const params =
    aggregation === 'moving_average' ? convertToMovingAverageParams(metric) : undefined;
  if (params === null) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }

  return {
    operationType: aggregation,
    references,
    ...createColumn(series, metric, field),
    params,
  } as MovingAverageColumn | DerivativeColumn;
};
