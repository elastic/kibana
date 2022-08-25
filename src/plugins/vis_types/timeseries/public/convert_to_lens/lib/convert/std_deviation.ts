/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Metric, Series } from '../../../../common/types';
import { getFormulaEquivalent, SUPPORTED_METRICS } from '../metrics';
import { createFormulaColumn } from './formula';
import { convertMetricAggregationColumnWithoutParams } from './parent_pipeline';

const createStandartDeviationFormulaColumn = (
  series: Series,
  currentMetric: Metric,
  metrics: Metric[],
  window?: string
) => {
  const script = getFormulaEquivalent(currentMetric, metrics, undefined, window);
  if (!script) return null;
  return createFormulaColumn(script, series, currentMetric);
};

export const convertToStandartDeviationColumn = (
  series: Series,
  metrics: Metric[],
  dataView: DataView,
  window?: string
) => {
  const currentMetric = metrics[metrics.length - 1];

  const field = currentMetric.field ? dataView.getFieldByName(currentMetric.field) : undefined;
  if (!field) {
    return null;
  }

  const columns = [];

  if (currentMetric.mode === 'upper' || currentMetric.mode === 'lower') {
    columns.push(createStandartDeviationFormulaColumn(series, currentMetric, metrics, window));
  } else if (currentMetric.mode === 'band') {
    [
      { ...currentMetric, mode: 'upper' },
      { ...currentMetric, mode: 'lower' },
    ].forEach((metric) => {
      columns.push(createStandartDeviationFormulaColumn(series, metric, metrics, window));
    });
  } else {
    columns.push(
      convertMetricAggregationColumnWithoutParams(
        SUPPORTED_METRICS.std_deviation,
        series,
        currentMetric,
        dataView,
        window
      )
    );
  }

  return columns;
};
