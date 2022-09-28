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
import { getSeriesAgg } from '../../series';
import { getPalette } from './palette';

const getMetricWithCollapseFn = (series: Series | undefined) => {
  if (!series) {
    return;
  }
  const { metrics, seriesAgg } = getSeriesAgg(series.metrics);
  const visibleMetric = metrics[metrics.length - 1];
  return { metric: visibleMetric, collapseFn: seriesAgg };
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

  const primaryMetricWithCollapseFn = getMetricWithCollapseFn(primarySeries);

  if (!primaryMetricWithCollapseFn || !primaryMetricWithCollapseFn.metric) {
    return null;
  }

  const secondaryMetricWithCollapseFn = getMetricWithCollapseFn(secondarySeries);
  const primaryColumn = findMetricColumn(primaryMetricWithCollapseFn.metric, layer.columns);
  const secondaryColumn = findMetricColumn(secondaryMetricWithCollapseFn?.metric, layer.columns);

  if (primaryMetricWithCollapseFn.collapseFn && secondaryMetricWithCollapseFn?.collapseFn) {
    return null;
  }

  const palette = getPalette(model.background_color_rules ?? []);
  if (palette === null) {
    return null;
  }

  return {
    layerId: layer.layerId,
    layerType: 'data',
    metricAccessor: primaryColumn?.columnId,
    secondaryMetricAccessor: secondaryColumn?.columnId,
    breakdownByAccessor: bucket?.columnId,
    palette,
    collapseFn: primaryMetricWithCollapseFn.collapseFn ?? secondaryMetricWithCollapseFn?.collapseFn,
  };
};
