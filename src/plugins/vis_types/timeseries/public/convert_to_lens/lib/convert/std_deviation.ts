/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric } from '../../../../common/types';
import { getFormulaEquivalent, SUPPORTED_METRICS } from '../metrics';
import { createFormulaColumn } from './formula';
import { convertMetricAggregationColumnWithoutSpecialParams } from './parent_pipeline';
import { CommonColumnConverterArgs, CommonColumnsConverterArgs } from './types';

const createStandartDeviationFormulaColumn = (
  { series, metric, dataView }: CommonColumnConverterArgs,
  metrics: Metric[],
  reducedTimeRange?: string
) => {
  const script = getFormulaEquivalent(metric, metrics, {
    reducedTimeRange,
    timeShift: series.offset_time,
  });
  if (!script) return null;
  return createFormulaColumn(script, { series, metric, dataView });
};

export const convertToStandartDeviationColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
) => {
  const metric = metrics[metrics.length - 1];

  const field = metric.field ? dataView.getFieldByName(metric.field) : undefined;
  if (!field) {
    return null;
  }

  const columns = [];

  if (metric.mode === 'upper' || metric.mode === 'lower') {
    columns.push(
      createStandartDeviationFormulaColumn({ series, metric, dataView }, metrics, reducedTimeRange)
    );
  } else if (metric.mode === 'band') {
    [
      { ...metric, mode: 'upper' },
      { ...metric, mode: 'lower' },
    ].forEach((m) => {
      columns.push(
        createStandartDeviationFormulaColumn(
          { series, metric: m, dataView },
          metrics,
          reducedTimeRange
        )
      );
    });
  } else {
    columns.push(
      convertMetricAggregationColumnWithoutSpecialParams(
        SUPPORTED_METRICS.std_deviation,
        { series, metrics: [metric], dataView },
        { reducedTimeRange, timeShift: series.offset_time }
      )
    );
  }

  return columns;
};
