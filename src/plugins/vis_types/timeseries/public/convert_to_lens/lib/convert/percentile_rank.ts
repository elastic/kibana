/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  Operations,
  PercentileRanksParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { Metric, Series } from '../../../../common/types';
import { AdditionalArgs } from '../../types';
import { createColumn, getFormat } from './column';
import {
  PercentileRanksColumn,
  Column,
  PercentileRanksColumnWithExtendedMeta,
  CommonColumnConverterArgs,
  PercentileColumn,
} from './types';

export const isPercentileRanksColumnWithMeta = (
  column: Column
): column is PercentileRanksColumnWithExtendedMeta =>
  column.operationType === Operations.PERCENTILE_RANK &&
  Boolean((column as PercentileRanksColumnWithExtendedMeta).meta?.reference);

export const convertToPercentileRankParams = (value?: string): PercentileRanksParams | null =>
  value !== undefined && !isNaN(Number(value))
    ? {
        value: Number(value),
      }
    : null;

export const convertToPercentileRankColumn = (
  value: string | undefined,
  series: Series,
  metric: Metric,
  dataView: DataView,
  {
    index,
    reducedTimeRange,
    timeShift,
  }: { index?: number; reducedTimeRange?: string; timeShift?: string } = {}
): PercentileRanksColumn | null => {
  const params = convertToPercentileRankParams(value);
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
    operationType: 'percentile_rank',
    sourceField: field.name,
    ...commonColumnParams,
    params: { ...params, ...getFormat(series) },
    meta,
  };
};

export const convertToPercentileRankColumns = (
  { series, metric, dataView }: CommonColumnConverterArgs,
  additionalArgs: AdditionalArgs
): Array<PercentileRanksColumn | null> | null => {
  const { values } = metric;

  if (!values) {
    return null;
  }

  return values.map((p, index) =>
    convertToPercentileRankColumn(p, series, metric, dataView, { index, ...additionalArgs })
  );
};
