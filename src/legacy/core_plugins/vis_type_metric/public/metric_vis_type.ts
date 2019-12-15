/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';

// @ts-ignore
import { Schemas } from 'ui/vis/editors/default/schemas';

import { AggGroupNames } from 'ui/vis/editors/default';
import { colorSchemas, ColorSchemas } from 'ui/vislib/components/color/colormaps';

// @ts-ignore
import { MetricVisComponent } from './components/metric_vis_controller';

import { MetricVisOptions } from './components/metric_vis_options';
import { ColorModes } from '../../kbn_vislib_vis_types/public/utils/collections';

export const metricVisDefinition = {
  name: 'metric',
  title: i18n.translate('visTypeMetric.metricTitle', { defaultMessage: 'Metric' }),
  icon: 'visMetric',
  description: i18n.translate('visTypeMetric.metricDescription', {
    defaultMessage: 'Display a calculation as a single number',
  }),
  visConfig: {
    component: MetricVisComponent,
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
};
