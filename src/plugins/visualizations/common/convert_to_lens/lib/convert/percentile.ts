/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { Operations, PercentileParams } from '../..';
import { getFieldNameFromField, getLabelForPercentile } from '../utils';
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

export const convertToPercentileParams = (percentile: number): PercentileParams => ({
  percentile,
});

const isSinglePercentile = (
  agg: SchemaConfig<METRIC_TYPES.PERCENTILES | METRIC_TYPES.SINGLE_PERCENTILE>
): agg is SchemaConfig<METRIC_TYPES.SINGLE_PERCENTILE> => {
  if (agg.aggType === METRIC_TYPES.SINGLE_PERCENTILE) {
    return true;
  }
  return false;
};

const getPercent = (
  agg: SchemaConfig<METRIC_TYPES.PERCENTILES | METRIC_TYPES.SINGLE_PERCENTILE>
) => {
  if (isSinglePercentile(agg)) {
    return agg.aggParams?.percentile;
  }
  const { aggParams, aggId } = agg;
  if (!aggParams || !aggId) {
    return null;
  }

  const { percents } = aggParams;

  const [, percentStr] = aggId.split('.');

  const percent = Number(percentStr);
  if (!percents || !percents.length || percentStr === '' || isNaN(percent)) {
    return null;
  }
  return percent;
};

export const convertToPercentileColumn = (
  {
    agg,
    dataView,
  }: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILES | METRIC_TYPES.SINGLE_PERCENTILE>,
  { index, reducedTimeRange }: { index?: number; reducedTimeRange?: string } = {}
): PercentileColumn | null => {
  const { aggParams, aggId } = agg;
  if (!aggParams || !aggId) {
    return null;
  }
  const percent = getPercent(agg);
  if (percent === null || percent === undefined) {
    return null;
  }

  const params = convertToPercentileParams(percent);

  const fieldName = getFieldNameFromField(agg?.aggParams?.field);

  if (!fieldName) {
    return null;
  }

  const field = dataView.getFieldByName(fieldName);
  if (!field) {
    return null;
  }
  const commonColumnParams = createColumn(agg, field, { reducedTimeRange });

  return {
    operationType: 'percentile',
    sourceField: field.name,
    ...commonColumnParams,
    params: { ...params, ...getFormat() },
    label: getLabelForPercentile(agg),
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
