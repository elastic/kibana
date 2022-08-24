/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { Operations, PercentileParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Metric, Percentile, Series } from '../../../../common/types';
import { createColumn } from './column';
import { PercentileColumnWithExtendedMeta, PercentileColumn, Column } from './types';

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
  series: Series,
  metric: Metric,
  dataView: DataView,
  index?: number,
  window?: string
): PercentileColumn | null => {
  const params = convertToPercentileParams(percentile);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }
  const commonColumnParams = createColumn(series, metric, field, false, false, window);
  return {
    operationType: 'percentile',
    sourceField: field.name,
    ...commonColumnParams,
    params,
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
  series: Series,
  metric: Metric,
  dataView: DataView,
  window?: string
): Array<PercentileColumn | null> | null => {
  const { percentiles } = metric;

  if (!percentiles) {
    return null;
  }

  return percentiles.map((p, index) =>
    convertToPercentileColumn(p.value, series, metric, dataView, index, window)
  );
};
