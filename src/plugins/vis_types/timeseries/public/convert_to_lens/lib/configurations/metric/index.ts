/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import color from 'color';
import { MetricVisConfiguration } from '@kbn/visualizations-plugin/common';
import { Panel } from '../../../../../common/types';
import { Column, Layer } from '../../convert';
import { getPalette } from '../palette';
import { findMetricColumn, getMetricWithCollapseFn } from '../../../utils';

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

export const getConfigurationForGauge = (
  model: Panel,
  layer: Layer,
  bucket: Column | undefined,
  gaugeMaxColumn?: Column
): MetricVisConfiguration | null => {
  const primarySeries = model.series[0];
  const primaryMetricWithCollapseFn = getMetricWithCollapseFn(primarySeries);
  if (!primaryMetricWithCollapseFn || !primaryMetricWithCollapseFn.metric) {
    return null;
  }

  const primaryColumn = findMetricColumn(primaryMetricWithCollapseFn.metric, layer.columns);
  const primaryColor = primarySeries.color ? color(primarySeries.color).hex() : undefined;

  const gaugePalette = getPalette(model.gauge_color_rules ?? [], primaryColor);
  if (gaugePalette === null) {
    return null;
  }

  return {
    layerId: layer.layerId,
    layerType: 'data',
    metricAccessor: primaryColumn?.columnId,
    breakdownByAccessor: bucket?.columnId,
    maxAccessor: gaugeMaxColumn?.columnId,
    showBar: Boolean(gaugeMaxColumn),
    palette: gaugePalette,
    collapseFn: primaryMetricWithCollapseFn.collapseFn,
    ...(gaugePalette ? {} : { color: primaryColor }),
  };
};
