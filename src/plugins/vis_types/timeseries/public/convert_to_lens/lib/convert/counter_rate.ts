/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Operations } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { createColumn, getFormat } from './column';
import { CommonColumnsConverterArgs, CounterRateColumn, MaxColumn } from './types';

export const convertToCounterRateColumn = ({
  series,
  metrics,
  dataView,
}: CommonColumnsConverterArgs): [MaxColumn, CounterRateColumn] | null => {
  const metric = metrics[metrics.length - 1];

  const field = metric.field ? dataView.getFieldByName(metric.field) : undefined;
  if (!field) {
    return null;
  }

  const maxColumn = {
    operationType: Operations.MAX,
    sourceField: field.name,
    ...createColumn(series, metric, field),
    params: { ...getFormat(series) },
  };

  return [
    maxColumn,
    {
      operationType: Operations.COUNTER_RATE,
      references: [maxColumn.columnId],
      ...createColumn(series, metric, field, { timeShift: series.offset_time }),
      params: { ...getFormat(series) },
    },
  ];
};
