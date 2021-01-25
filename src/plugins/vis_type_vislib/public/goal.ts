/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { AggGroupNames } from '../../data/public';
import { ColorMode, ColorSchemas } from '../../charts/public';
import { BaseVisTypeOptions } from '../../visualizations/public';

import { getGaugeCollections, GaugeOptions } from './editor';
import { toExpressionAst } from './to_ast';
import { GaugeType, BasicVislibParams } from './types';

export const goalVisTypeDefinition: BaseVisTypeOptions<BasicVislibParams> = {
  name: 'goal',
  title: i18n.translate('visTypeVislib.goal.goalTitle', { defaultMessage: 'Goal' }),
  icon: 'visGoal',
  description: i18n.translate('visTypeVislib.goal.goalDescription', {
    defaultMessage: 'Track how a metric progresses to a goal.',
  }),
  toExpressionAst,
  visConfig: {
    defaults: {
      addTooltip: true,
      addLegend: false,
      isDisplayWarning: false,
      type: 'gauge',
      gauge: {
        verticalSplit: false,
        autoExtend: false,
        percentageMode: true,
        gaugeType: GaugeType.Arc,
        gaugeStyle: 'Full',
        backStyle: 'Full',
        orientation: 'vertical',
        useRanges: false,
        colorSchema: ColorSchemas.GreenToRed,
        gaugeColorMode: ColorMode.None,
        colorsRange: [{ from: 0, to: 10000 }],
        invertColors: false,
        labels: {
          show: true,
          color: 'black',
        },
        scale: {
          show: false,
          labels: false,
          color: 'rgba(105,112,125,0.2)',
          width: 2,
        },
        type: 'meter',
        style: {
          bgFill: 'rgba(105,112,125,0.2)',
          bgColor: false,
          labelColor: false,
          subText: '',
          fontSize: 60,
        },
      },
    },
  },
  editorConfig: {
    collections: getGaugeCollections(),
    optionsTemplate: GaugeOptions,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeVislib.goal.metricTitle', { defaultMessage: 'Metric' }),
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
        title: i18n.translate('visTypeVislib.goal.groupTitle', {
          defaultMessage: 'Split group',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ],
  },
  useCustomNoDataScreen: true,
};
