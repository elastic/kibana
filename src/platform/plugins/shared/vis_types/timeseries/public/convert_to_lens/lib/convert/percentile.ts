/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Operations, PercentileParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Percentile } from '../../../../common/types';
import { AdditionalArgs } from '../../types';
import { createColumn, getFormat } from './column';
import {
  PercentileColumnWithExtendedMeta,
  PercentileColumn,
  Column,
  CommonColumnConverterArgs,
} from './types';

export const isPercentileColumnWithMeta = (
  column: Column
): column is PercentileColumnWithExtendedMeta =>
  column.operationType === Operations.PERCENTILE &&
  Boolean((column as PercentileColumnWithExtendedMeta)?.meta?.reference);

export const convertToPercentileParams = (value?: string | number): PercentileParams | null =>
  value !== undefined && !isNaN(Number(value))
    ? {
        percentile: Number(value),
      }
    : null;

export const convertToPercentileColumn = (
  percentile: Percentile['value'],
  { series, metric, dataView }: CommonColumnConverterArgs,
  {
    index,
    reducedTimeRange,
    timeShift,
  }: { index?: number; reducedTimeRange?: string; timeShift?: string } = {}
): PercentileColumn | null => {
  const params = convertToPercentileParams(percentile);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }
  const commonColumnParams = createColumn(series, metric, field, { reducedTimeRange, timeShift });
  const meta: PercentileColumn['meta'] =
    index !== undefined
      ? {
          reference: `${metric.id}.${index}`,
          ...commonColumnParams.meta,
        }
      : commonColumnParams.meta;

  return {
    operationType: 'percentile',
    sourceField: field.name,
    ...commonColumnParams,
    params: { ...params, ...getFormat(series) },
    meta,
  };
};

export const convertToPercentileColumns = (
  columnConverterArgs: CommonColumnConverterArgs,
  additionalArgs: AdditionalArgs
): Array<PercentileColumn | null> | null => {
  const { percentiles } = columnConverterArgs.metric;

  if (!percentiles) {
    return null;
  }

  return percentiles.map((p, index) =>
    convertToPercentileColumn(p.value, columnConverterArgs, { index, ...additionalArgs })
  );
};
