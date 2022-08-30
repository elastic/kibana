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
  FormatParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import uuid from 'uuid';
import type { Metric, Series } from '../../../../common/types';
import { ConvertToColumnsFn } from '../../types';
import { getTimeScale } from '../metrics';
import { ColumnWithMeta, Meta, Column, CommonColumnsConverterArgs } from './types';

type GeneralColumn = Omit<BaseColumn<Operation, unknown>, 'operationType' | 'params'>;
type GeneralColumnWithMeta = GenericColumnWithMeta<GeneralColumn, Meta>;
interface ExtraColumnFields {
  isBucketed?: boolean;
  isSplit?: boolean;
  reducedTimeRange?: string;
}

const isSupportedFormat = (format: string) => ['bytes', 'number', 'percent'].includes(format);

const findField = (series: Series, field?: string): string | undefined => {
  const subMetric = series.metrics.find((m) => m.id === field);
  if (subMetric) {
    return findField(series, subMetric.field);
  }
  return field;
};

export const getFormat = (
  series: Series,
  fieldName: string | undefined,
  dataView: DataView
): FormatParams => {
  if (series.formatter === 'default') {
    const correctFieldName = findField(series, fieldName);

    if (!correctFieldName) {
      return {};
    }

    const field = dataView.getFieldByName(correctFieldName);
    if (!field) {
      return {};
    }

    const formatter = dataView.getFormatterForField(field);
    const id = formatter.type.id;

    if (!isSupportedFormat(id)) {
      return {};
    }
    return { format: { id } };
  }

  if (!isSupportedFormat(series.formatter)) {
    return {};
  }

  return { format: { id: series.formatter } };
};

export const createColumn = (
  series: Series,
  metric: Metric,
  field?: DataViewField,
  { isBucketed = false, isSplit = false, reducedTimeRange }: ExtraColumnFields = {}
): GeneralColumnWithMeta => ({
  columnId: uuid(),
  dataType: (field?.type as DataType) ?? undefined,
  label: series.label,
  isBucketed,
  isSplit,
  reducedTimeRange,
  filter: series.filter,
  timeScale: getTimeScale(metric),
  meta: { metricId: metric.id },
});

export const convertMetricsToColumns = <C extends Column>(
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  convertToFn: ConvertToColumnsFn<C>,
  reducedTimeRange?: string
) => metrics.flatMap((metric) => convertToFn({ series, metric, dataView }, reducedTimeRange));

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
