/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ColorMode, ColorSchemas, ColorSchemaParams, Labels, Style } from '../../charts/public';
import { RangeValues } from '../../vis_default_editor/public';
import { AggGroupNames } from '../../data/public';
import { VisTypeDefinition, VIS_EVENT_TO_TRIGGER } from '../../visualizations/public';

import { Alignment, GaugeType, VislibChartType } from './types';
import { toExpressionAst } from './to_ast';
import { GaugeOptions } from './editor/components';

export interface Gauge extends ColorSchemaParams {
  backStyle: 'Full';
  gaugeStyle: 'Full';
  orientation: 'vertical';
  type: 'meter';
  alignment: Alignment;
  colorsRange: RangeValues[];
  extendRange: boolean;
  gaugeType: GaugeType;
  labels: Labels;
  percentageMode: boolean;
  outline?: boolean;
  scale: {
    show: boolean;
    labels: false;
    color: 'rgba(105,112,125,0.2)';
  };
  style: Style;
}

export interface GaugeVisParams {
  type: 'gauge';
  addTooltip: boolean;
  addLegend: boolean;
  isDisplayWarning: boolean;
  gauge: Gauge;
}

export const gaugeVisTypeDefinition: VisTypeDefinition<GaugeVisParams> = {
  name: 'gauge',
  title: i18n.translate('visTypeVislib.gauge.gaugeTitle', { defaultMessage: 'Gauge' }),
  icon: 'visGauge',
  description: i18n.translate('visTypeVislib.gauge.gaugeDescription', {
    defaultMessage: 'Show the status of a metric.',
  }),
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter],
  toExpressionAst,
  visConfig: {
    defaults: {
      type: VislibChartType.Gauge,
      addTooltip: true,
      addLegend: true,
      isDisplayWarning: false,
      gauge: {
        alignment: Alignment.Automatic,
        extendRange: true,
        percentageMode: false,
        gaugeType: GaugeType.Arc,
        gaugeStyle: 'Full',
        backStyle: 'Full',
        orientation: 'vertical',
        colorSchema: ColorSchemas.GreenToRed,
        gaugeColorMode: ColorMode.Labels,
        colorsRange: [
          { from: 0, to: 50 },
          { from: 50, to: 75 },
          { from: 75, to: 100 },
        ],
        invertColors: false,
        labels: {
          show: true,
          color: 'black',
        },
        scale: {
          show: true,
          labels: false,
          color: 'rgba(105,112,125,0.2)',
        },
        type: 'meter',
        style: {
          bgWidth: 0.9,
          width: 0.9,
          mask: false,
          bgMask: false,
          maskBars: 50,
          bgFill: 'rgba(105,112,125,0.2)',
          bgColor: true,
          subText: '',
          fontSize: 60,
        },
      },
    },
  },
  editorConfig: {
    optionsTemplate: GaugeOptions,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeVislib.gauge.metricTitle', { defaultMessage: 'Metric' }),
        min: 1,
        aggFilter: [
          '!std_dev',
          '!geo_centroid',
          '!percentiles',
          '!percentile_ranks',
          '!derivative',
          '!serial_diff',
          '!moving_avg',
          '!cumulative_sum',
          '!geo_bounds',
        ],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeVislib.gauge.groupTitle', {
          defaultMessage: 'Split group',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ],
  },
  requiresSearch: true,
};
