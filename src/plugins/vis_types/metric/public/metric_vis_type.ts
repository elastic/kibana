/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ColorSchemas, ColorMode } from '@kbn/charts-plugin/public';
import { VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import { AggGroupNames } from '@kbn/data-plugin/public';
import { MetricVisOptions } from './components';
import { toExpressionAst } from './to_ast';
import { VisParams } from './types';

export const createMetricVisTypeDefinition = (): VisTypeDefinition<VisParams> => ({
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
        metricColorMode: ColorMode.None,
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
    optionsTemplate: MetricVisOptions,
    schemas: [
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
          '!filtered_metric',
          '!single_percentile',
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
        aggFilter: [
          '!geohash_grid',
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!rare_terms',
          '!multi_terms',
          '!significant_text',
        ],
      },
    ],
  },
  requiresSearch: true,
});
