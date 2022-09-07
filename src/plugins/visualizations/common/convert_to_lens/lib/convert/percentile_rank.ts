/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { PercentileRanksParams } from '../..';
import { getFieldNameFromField } from '../utils';
import { createColumn } from './column';
import { PercentileRanksColumn, CommonColumnConverterArgs } from './types';

export const convertToPercentileRankParams = (value: number): PercentileRanksParams => ({
  value: Number(value),
});

export const convertToPercentileRankColumn = (
  { agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILE_RANKS>,
  { index, reducedTimeRange }: { index?: number; reducedTimeRange?: string } = {}
): PercentileRanksColumn | null => {
  const { aggParams, aggId } = agg;
  if (!aggParams || !aggId) {
    return null;
  }
  const { values } = aggParams;
  const [, percentStr] = aggId.split('.');

  const percent = Number(percentStr);

  if (!values || !values.length || percentStr === '' || isNaN(percent)) {
    return null;
  }

  const params = convertToPercentileRankParams(percent);
  const fieldName = getFieldNameFromField(agg.aggParams!.field);
  if (!fieldName) {
    return null;
  }

  const field = dataView.getFieldByName(fieldName);
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
    timeShift: agg.aggParams?.timeShift,
  };
};
