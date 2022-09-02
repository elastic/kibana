/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { PercentileRanksParams } from '../..';
import { createColumn } from './column';
import { PercentileRanksColumn, CommonColumnConverterArgs } from './types';

export const convertToPercentileRankParams = (value: number): PercentileRanksParams | null => ({
  value: Number(value),
});

export const convertToPercentileRankColumn = (
  value: number,
  { agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILE_RANKS>,
  { index, reducedTimeRange }: { index?: number; reducedTimeRange?: string } = {}
): PercentileRanksColumn | null => {
  const params = convertToPercentileRankParams(value);
  if (!params) {
    return null;
  }

  const field = dataView.getFieldByName(agg.aggParams!.field ?? '');
  if (!field) {
    return null;
  }

  const commonColumnParams = createColumn(agg, field, { reducedTimeRange });
  return {
    operationType: 'percentile_rank',
    sourceField: field.name,
    ...commonColumnParams,
    params: { ...params },
    meta:
      index !== undefined
        ? {
            reference: `${commonColumnParams.meta.aggId}.${index}`,
            ...commonColumnParams.meta,
          }
        : commonColumnParams.meta,
  };
};

export const convertToPercentileRankColumns = (
  columnConverterArgs: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILE_RANKS>,
  reducedTimeRange?: string
): Array<PercentileRanksColumn | null> | null => {
  if (!columnConverterArgs.agg.aggParams) {
    return null;
  }

  const { values } = columnConverterArgs.agg.aggParams;

  if (!values || !values.length) {
    return null;
  }

  return values.map((p, index) =>
    convertToPercentileRankColumn(p, columnConverterArgs, { index, reducedTimeRange })
  );
};
