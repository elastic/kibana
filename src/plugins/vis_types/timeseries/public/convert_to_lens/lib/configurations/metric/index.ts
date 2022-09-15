/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MetricVisConfiguration } from '@kbn/visualizations-plugin/common';
import { Metric, Panel, Series } from '../../../../../common/types';
import { Column, Layer } from '../../convert';

const getMetric = (series: Series | undefined) => {
  if (!series) {
    return;
  }

  const visibleMetric = series.metrics[series.metrics.length - 1];
  return visibleMetric;
};

const findMetricColumn = (metric: Metric | undefined, columns: Column[]) => {
  if (!metric) {
    return;
  }

  return columns.find((column) => 'meta' in column && column.meta.metricId === metric.id);
};

export const getConfigurationForMetric = (
  model: Panel,
  layer: Layer,
  bucket?: Column
): MetricVisConfiguration | null => {
  const [primarySeries, secondarySeries] = model.series.filter(({ hidden }) => !hidden);
  const primaryMetric = getMetric(primarySeries);
  if (!primaryMetric) {
    return null;
  }

  const secondaryMetric = getMetric(secondarySeries);
  const primaryColumn = findMetricColumn(primaryMetric, layer.columns);
  const secondaryColumn = findMetricColumn(secondaryMetric, layer.columns);

  return {
    layerId: layer.layerId,
    layerType: 'data',
    metricAccessor: primaryColumn?.columnId,
    secondaryMetricAccessor: secondaryColumn?.columnId,
    // maxAccessor?: string;
    breakdownByAccessor: bucket?.columnId,
    // // the dimensions can optionally be single numbers
    // // computed by collapsing all rows
    // collapseFn?: string;
    // subtitle?: string;
    // secondaryPrefix?: string;
    // color?: string;
    // palette?: PaletteOutput<CustomPaletteParams>;
    // maxCols?: number;
  };
};
