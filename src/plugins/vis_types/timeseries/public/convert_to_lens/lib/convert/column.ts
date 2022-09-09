/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  BaseColumn,
  Operation,
  DataType,
  GenericColumnWithMeta,
  FormatParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import uuid from 'uuid';
import type { Metric, Series } from '../../../../common/types';
import { DATA_FORMATTERS } from '../../../../common/enums';
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

export const getFormat = (series: Series): FormatParams => {
  let suffix;

  if (!series.formatter) {
    return {};
  }

  if (series.value_template) {
    suffix = series.value_template.split('}}')[1];
  }

  // not supported formatters should be converted to number
  if (!isSupportedFormat(series.formatter)) {
    return {
      format: { id: DATA_FORMATTERS.NUMBER, ...(suffix && { params: { suffix, decimals: 0 } }) },
    };
  }

  return { format: { id: series.formatter, ...(suffix && { params: { suffix, decimals: 0 } }) } };
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
