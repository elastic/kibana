/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { isFieldValid, PercentileRanksParams } from '../..';
import { getFieldNameFromField, getLabelForPercentile } from '../utils';
import { createColumn, getFormat } from './column';
import { PercentileRanksColumn, CommonColumnConverterArgs } from './types';
import { SUPPORTED_METRICS } from './supported_metrics';

export const convertToPercentileRankParams = (value: number): PercentileRanksParams => ({
  value: Number(value),
});

const isSinglePercentileRank = (
  agg: SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS | METRIC_TYPES.SINGLE_PERCENTILE_RANK>
): agg is SchemaConfig<METRIC_TYPES.SINGLE_PERCENTILE_RANK> => {
  if (agg.aggType === METRIC_TYPES.SINGLE_PERCENTILE_RANK) {
    return true;
  }
  return false;
};

const getPercent = (
  agg: SchemaConfig<METRIC_TYPES.PERCENTILE_RANKS | METRIC_TYPES.SINGLE_PERCENTILE_RANK>
) => {
  if (isSinglePercentileRank(agg)) {
    return agg.aggParams?.value;
  }
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
  return percent;
};

export const convertToPercentileRankColumn = (
  {
    visType,
    agg,
    dataView,
  }: CommonColumnConverterArgs<METRIC_TYPES.SINGLE_PERCENTILE_RANK | METRIC_TYPES.PERCENTILE_RANKS>,
  { index, reducedTimeRange }: { index?: number; reducedTimeRange?: string } = {}
): PercentileRanksColumn | null => {
  const { aggParams } = agg;
  const percent = getPercent(agg);

  if (percent === null || percent === undefined) {
    return null;
  }

  const params = convertToPercentileRankParams(percent);
  const fieldName = getFieldNameFromField(aggParams!.field);
  if (!fieldName) {
    return null;
  }

  const field = dataView.getFieldByName(fieldName);
  if (!isFieldValid(visType, field, SUPPORTED_METRICS[agg.aggType])) {
    return null;
  }

  return {
    operationType: 'percentile_rank',
    sourceField: field.name,
    ...createColumn(agg, field, { reducedTimeRange }),
    params: { ...params, ...getFormat() },
    label: getLabelForPercentile(agg),
    timeShift: aggParams?.timeShift,
  };
};
