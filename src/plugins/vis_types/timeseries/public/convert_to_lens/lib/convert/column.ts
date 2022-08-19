/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import {
  BaseColumn,
  Operation,
  DataType,
  Column,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import uuid from 'uuid';
import type { Metric, Series } from '../../../../common/types';
import { ConvertToColumnsFn } from '../../types';
import { getTimeScale } from '../metrics';

export const createColumn = (
  series: Series,
  metric: Metric,
  field?: DataViewField,
  isBucketed: boolean = false,
  isSplit: boolean = false
): Omit<BaseColumn<Operation, unknown>, 'operationType' | 'params'> => ({
  columnId: uuid(),
  dataType: (field?.type as DataType) ?? undefined,
  label: series.label,
  isBucketed,
  isSplit,
  window: metric.window?.toString(),
  filter: series.filter,
  timeScale: getTimeScale(metric),
});

export const convertMetricsToColumns = <C extends Column>(
  series: Series,
  metrics: Metric[],
  dataView: DataView,
  convertToFn: ConvertToColumnsFn<C>
) => metrics.flatMap((metric) => convertToFn(series, metric, dataView));
