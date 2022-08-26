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
  ColumnWithMeta as GenericColumnWithMeta,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import uuid from 'uuid';
import type { Metric, Series } from '../../../../common/types';
import { ConvertToColumnsFn } from '../../types';
import { getTimeScale } from '../metrics';
import { ColumnWithMeta, Meta, Column } from './types';

type GeneralColumn = Omit<BaseColumn<Operation, unknown>, 'operationType' | 'params'>;
type GeneralColumnWithMeta = GenericColumnWithMeta<GeneralColumn, Meta>;
interface ExtraColumnFields {
  isBucketed?: boolean;
  isSplit?: boolean;
  window?: string;
}

export const createColumn = (
  series: Series,
  metric: Metric,
  field?: DataViewField,
  { isBucketed = false, isSplit = false, window }: ExtraColumnFields = {}
): GeneralColumnWithMeta => ({
  columnId: uuid(),
  dataType: (field?.type as DataType) ?? undefined,
  label: series.label,
  isBucketed,
  isSplit,
  window,
  filter: series.filter,
  timeScale: getTimeScale(metric),
  meta: { metricId: metric.id },
});

export const convertMetricsToColumns = <C extends Column>(
  series: Series,
  metrics: Metric[],
  dataView: DataView,
  convertToFn: ConvertToColumnsFn<C>,
  window?: string
) => metrics.flatMap((metric) => convertToFn(series, metric, dataView, window));

export const isColumnWithMeta = (column: Column): column is ColumnWithMeta => {
  if ((column as ColumnWithMeta).meta) {
    return true;
  }
  return false;
};

export const excludeMetaFromColumn = (column: Column) => {
  if (isColumnWithMeta(column)) {
    const { meta, ...rest } = column;
    return rest;
  }
  return column;
};
