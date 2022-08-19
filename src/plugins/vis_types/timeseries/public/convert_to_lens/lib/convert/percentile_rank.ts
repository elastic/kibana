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
  ColumnWithMeta,
  Operations,
  PercentileRanksColumnWithMeta,
  PercentileRanksParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Metric, Series } from '../../../../common/types';
import { createColumn } from './column';

export const isPercentileRanksColumnWithMeta = (
  column: Column | ColumnWithMeta
): column is PercentileRanksColumnWithMeta =>
  column.operationType === Operations.PERCENTILE_RANK && Boolean((column as ColumnWithMeta).meta);

export const convertToPercentileRankParams = (value: string): PercentileRanksParams | null =>
  value !== undefined && !isNaN(Number(value))
    ? {
        value: Number(value),
      }
    : null;

const convertToPercentileRankColumn = (
  value: string,
  series: Series,
  metric: Metric,
  dataView: DataView,
  index: number
): PercentileRanksColumnWithMeta | null => {
  const params = convertToPercentileRankParams(value);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(metric.field ?? 'document');
  if (!field) {
    return null;
  }

  return {
    operationType: 'percentile_rank',
    sourceField: field.name,
    ...createColumn(series, metric, field),
    params,
    meta: {
      reference: `${metric.id}.${index}`,
    },
  };
};

export const convertToPercentileRankColumns = (
  series: Series,
  metric: Metric,
  dataView: DataView
): PercentileRanksColumnWithMeta[] => {
  const { values } = metric;

  if (!values) {
    return [];
  }

  return values
    .map((p, index) => convertToPercentileRankColumn(p, series, metric, dataView, index))
    .filter((p): p is PercentileRanksColumnWithMeta => Boolean(p));
};
