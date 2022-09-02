/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { Operations, PercentileParams } from '../..';
import { createColumn } from './column';
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

export const convertToPercentileColumn = (
  percentile: number,
  { agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILES>,
  { index, reducedTimeRange }: { index?: number; reducedTimeRange?: string } = {}
): PercentileColumn | null => {
  const params = convertToPercentileParams(percentile);

  const field = dataView.getFieldByName(agg?.aggParams?.field ?? '');
  if (!field) {
    return null;
  }
  const commonColumnParams = createColumn(agg, field, { reducedTimeRange });
  return {
    operationType: 'percentile',
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

export const convertToPercentileColumns = (
  columnConverterArgs: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILES>,
  reducedTimeRange?: string
): Array<PercentileColumn | null> | null => {
  const { aggParams } = columnConverterArgs.agg;
  if (!aggParams) {
    return null;
  }

  const { percents } = aggParams;

  if (!percents || !percents.length) {
    return null;
  }

  return percents.map((p, index) =>
    convertToPercentileColumn(p, columnConverterArgs, { index, reducedTimeRange })
  );
};
