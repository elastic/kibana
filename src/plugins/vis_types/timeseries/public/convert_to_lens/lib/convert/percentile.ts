/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  Column,
  Operations,
  PercentileParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Metric, Percentile, Series } from '../../../../common/types';
import { createColumn } from './column';
import { CommonPercentileColumnWithMeta, PercentileColumnWithMeta } from './types';

export const isPercentileColumnWithMeta = (
  column: Column | CommonPercentileColumnWithMeta
): column is PercentileColumnWithMeta =>
  column.operationType === Operations.PERCENTILE &&
  Boolean((column as CommonPercentileColumnWithMeta).meta);

export const convertToPercentileParams = (value?: string | number): PercentileParams | null =>
  value !== undefined && !isNaN(Number(value))
    ? {
        percentile: Number(value),
      }
    : null;

const convertToPercentileColumn = (
  percentile: Percentile,
  series: Series,
  metric: Metric,
  dataView: DataView,
  index: number
): PercentileColumnWithMeta | null => {
  const params = convertToPercentileParams(percentile.value);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }

  return {
    operationType: 'percentile',
    sourceField: field.name,
    ...createColumn(series, metric, field),
    params,
    meta: {
      reference: `${metric.id}.${index}`,
    },
  };
};

export const convertToPercentileColumns = (
  series: Series,
  metric: Metric,
  dataView: DataView
): PercentileColumnWithMeta[] => {
  const { percentiles } = metric;

  if (!percentiles) {
    return [];
  }

  return percentiles
    .map((p, index) => convertToPercentileColumn(p, series, metric, dataView, index))
    .filter((p): p is PercentileColumnWithMeta => Boolean(p));
};
