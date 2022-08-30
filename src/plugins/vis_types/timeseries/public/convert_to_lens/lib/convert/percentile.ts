/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Operations, PercentileParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Percentile } from '../../../../common/types';
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
  { index, reducedTimeRange }: { index?: number; reducedTimeRange?: string } = {}
): PercentileColumn | null => {
  const params = convertToPercentileParams(percentile);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }
  const commonColumnParams = createColumn(series, metric, field, { reducedTimeRange });
  return {
    operationType: 'percentile',
    sourceField: field.name,
    ...commonColumnParams,
    params: { ...params, ...getFormat(series, metric.field, dataView) },
    meta:
      index !== undefined
        ? {
            reference: `${metric.id}.${index}`,
            ...commonColumnParams.meta,
          }
        : commonColumnParams.meta,
  };
};

export const convertToPercentileColumns = (
  columnConverterArgs: CommonColumnConverterArgs,
  reducedTimeRange?: string
): Array<PercentileColumn | null> | null => {
  const { percentiles } = columnConverterArgs.metric;

  if (!percentiles) {
    return null;
  }

  return percentiles.map((p, index) =>
    convertToPercentileColumn(p.value, columnConverterArgs, { index, reducedTimeRange })
  );
};
