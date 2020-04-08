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

import { GaugeOptions } from './components/options';
import { getGaugeCollections, GaugeTypes, ColorModes } from './utils/collections';
import { createVislibVisController } from './vis_controller';
import { VisTypeVislibDependencies } from './plugin';
import { ColorSchemas } from '../../../../plugins/charts/public';
import { AggGroupNames } from '../../../../plugins/data/public';
import { Schemas } from '../../../../plugins/vis_default_editor/public';

export const createGoalVisTypeDefinition = (deps: VisTypeVislibDependencies) => ({
  name: 'goal',
  title: i18n.translate('visTypeVislib.goal.goalTitle', { defaultMessage: 'Goal' }),
  icon: 'visGoal',
  description: i18n.translate('visTypeVislib.goal.goalDescription', {
    defaultMessage: 'A goal chart indicates how close you are to your final goal.',
  }),
  visualization: createVislibVisController(deps),
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
        gaugeType: GaugeTypes.ARC,
        gaugeStyle: 'Full',
        backStyle: 'Full',
        orientation: 'vertical',
        useRanges: false,
        colorSchema: ColorSchemas.GreenToRed,
        gaugeColorMode: ColorModes.NONE,
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
    schemas: new Schemas([
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
    ]),
  },
  useCustomNoDataScreen: true,
});
