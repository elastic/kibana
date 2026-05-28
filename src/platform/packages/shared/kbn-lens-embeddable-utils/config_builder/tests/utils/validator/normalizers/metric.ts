/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
  type MetricVisualizationState,
} from '@kbn/lens-common';

import type { LensAttributes } from '../../../../types';
import {
  DEFAULT_PRIMARY_ICON_ALIGNMENT,
  DEFAULT_PRIMARY_LABELS_ALIGNMENT,
  DEFAULT_PRIMARY_POSITION,
  DEFAULT_PRIMARY_VALUE_ALIGNMENT,
  DEFAULT_PRIMARY_VALUE_SIZING,
  DEFAULT_SECONDARY_LABEL_PLACEMENT,
  DEFAULT_SECONDARY_VALUE_ALIGNMENT,
} from '../../../../transforms/charts/metric/defaults';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getCommonNormalizer, getPaletteNormalizer } from './common';
import { getMetricAccessor } from '../../../../transforms/charts/utils';

type MetricAttributes = Extract<LensAttributes, { visualizationType: 'lnsMetric' }>;

const ACCESSOR = 'metric_accessor';
const TRENDLINE_LAYER_ID = `${DEFAULT_LAYER_ID}_trendline`;

function getColumnRemapping(viz: MetricVisualizationState): IdRemapping {
  return [
    [viz.metricAccessor, 'metric_accessor_metric'],
    [viz.secondaryMetricAccessor, 'metric_accessor_secondary'],
    [viz.maxAccessor, 'metric_accessor_max'],
    [viz.breakdownByAccessor, 'metric_accessor_breakdown'],
    [viz.trendlineTimeAccessor, 'x_date_histogram'],
    [viz.trendlineMetricAccessor, `${ACCESSOR}_trendline`],
    [viz.trendlineSecondaryMetricAccessor, `${ACCESSOR}_secondary_trendline`],
    [viz.trendlineBreakdownByAccessor, `${ACCESSOR}_breakdown_trendline`],
  ];
}

const alignVisualizationDefaults: NormalizerConfig<MetricAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;

    viz.showBar = viz.showBar ?? false;
    viz.titlesTextAlign = viz.titlesTextAlign ?? DEFAULT_PRIMARY_LABELS_ALIGNMENT;

    if (viz.icon) {
      viz.iconAlign = viz.iconAlign ?? DEFAULT_PRIMARY_ICON_ALIGNMENT;
    }

    viz.primaryAlign = viz.primaryAlign ?? viz.valuesTextAlign ?? DEFAULT_PRIMARY_VALUE_ALIGNMENT;
    viz.primaryPosition = viz.primaryPosition ?? DEFAULT_PRIMARY_POSITION;

    viz.secondaryAlign = viz.secondaryAlign ?? DEFAULT_SECONDARY_VALUE_ALIGNMENT;
    viz.secondaryLabelPosition = viz.secondaryLabelPosition ?? DEFAULT_SECONDARY_LABEL_PLACEMENT;

    viz.valueFontMode =
      viz.valueFontMode ?? (DEFAULT_PRIMARY_VALUE_SIZING === 'auto' ? 'default' : 'fit');

    if (viz.breakdownByAccessor && viz.maxCols == null) {
      viz.maxCols = LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS;
    }

    return attributes;
  },
  transformed: (attributes) => {
    const viz = attributes.state.visualization;

    viz.secondaryAlign = viz.secondaryAlign ?? DEFAULT_SECONDARY_VALUE_ALIGNMENT;
    viz.secondaryLabelPosition = viz.secondaryLabelPosition ?? DEFAULT_SECONDARY_LABEL_PLACEMENT;

    return attributes;
  },
};

const alignIds: NormalizerConfig<MetricAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const accessor = getMetricAccessor(viz);

    viz.layerId = DEFAULT_LAYER_ID;
    if (viz.trendlineLayerId) viz.trendlineLayerId = TRENDLINE_LAYER_ID;

    if (accessor) viz.metricAccessor = 'metric_accessor_metric';
    if (viz.secondaryMetricAccessor) viz.secondaryMetricAccessor = 'metric_accessor_secondary';
    if (viz.maxAccessor) viz.maxAccessor = 'metric_accessor_max';
    if (viz.breakdownByAccessor) viz.breakdownByAccessor = 'metric_accessor_breakdown';
    if (viz.trendlineTimeAccessor) viz.trendlineTimeAccessor = 'x_date_histogram';
    if (viz.trendlineMetricAccessor) viz.trendlineMetricAccessor = 'metric_accessor_trendline';
    if (viz.trendlineSecondaryMetricAccessor)
      viz.trendlineSecondaryMetricAccessor = 'metric_accessor_secondary_trendline';
    if (viz.trendlineBreakdownByAccessor)
      viz.trendlineBreakdownByAccessor = 'metric_accessor_breakdown_trendline';

    if (!viz.collapseFn) delete viz.collapseFn; // remove ""
    if ('accessor' in viz) delete viz.accessor;

    return attributes;
  },
};

export const normalizeMetric = mergeNormalizers([
  getCommonNormalizer<MetricAttributes>(({ state: { visualization } }) => ({
    layerRemapping: [
      [visualization.layerId, DEFAULT_LAYER_ID],
      [visualization.trendlineLayerId, TRENDLINE_LAYER_ID],
    ],
    columnRemapping: getColumnRemapping(visualization),
  })),
  getPaletteNormalizer<MetricAttributes>('state.visualization.palette'),
  alignIds,
  alignVisualizationDefaults,
]);
