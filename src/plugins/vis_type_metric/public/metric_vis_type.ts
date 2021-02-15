/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BaseVisTypeOptions } from 'src/plugins/visualizations/public';
import { MetricVisOptions } from './components/metric_vis_options';
import { ColorSchemas, colorSchemas, ColorModes } from '../../charts/public';
import { AggGroupNames } from '../../data/public';
import { Schemas } from '../../vis_default_editor/public';
import { toExpressionAst } from './to_ast';

export const createMetricVisTypeDefinition = (): BaseVisTypeOptions => ({
  name: 'metric',
  title: i18n.translate('visTypeMetric.metricTitle', { defaultMessage: 'Metric' }),
  icon: 'visMetric',
  description: i18n.translate('visTypeMetric.metricDescription', {
    defaultMessage: 'Show a calculation as a single number.',
  }),
  toExpressionAst,
  visConfig: {
    defaults: {
      addTooltip: true,
      addLegend: false,
      type: 'metric',
      metric: {
        percentageMode: false,
        useRanges: false,
        colorSchema: ColorSchemas.GreenToRed,
        metricColorMode: ColorModes.NONE,
        colorsRange: [{ from: 0, to: 10000 }],
        labels: {
          show: true,
        },
        invertColors: false,
        style: {
          bgFill: '#000',
          bgColor: false,
          labelColor: false,
          subText: '',
          fontSize: 60,
        },
      },
    },
  },
  editorConfig: {
    collections: {
      metricColorMode: [
        {
          id: ColorModes.NONE,
          label: i18n.translate('visTypeMetric.colorModes.noneOptionLabel', {
            defaultMessage: 'None',
          }),
        },
        {
          id: ColorModes.LABELS,
          label: i18n.translate('visTypeMetric.colorModes.labelsOptionLabel', {
            defaultMessage: 'Labels',
          }),
        },
        {
          id: ColorModes.BACKGROUND,
          label: i18n.translate('visTypeMetric.colorModes.backgroundOptionLabel', {
            defaultMessage: 'Background',
          }),
        },
      ],
      colorSchemas,
    },
    optionsTemplate: MetricVisOptions,
    schemas: new Schemas([
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeMetric.schemas.metricTitle', { defaultMessage: 'Metric' }),
        min: 1,
        aggFilter: [
          '!std_dev',
          '!geo_centroid',
          '!derivative',
          '!serial_diff',
          '!moving_avg',
          '!cumulative_sum',
          '!geo_bounds',
        ],
        aggSettings: {
          top_hits: {
            allowStrings: true,
          },
        },
        defaults: [
          {
            type: 'count',
            schema: 'metric',
          },
        ],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('visTypeMetric.schemas.splitGroupTitle', {
          defaultMessage: 'Split group',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ]),
  },
});
