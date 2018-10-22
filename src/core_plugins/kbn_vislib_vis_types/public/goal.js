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

import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { CATEGORY } from 'ui/vis/vis_category';
import gaugeTemplate from './editors/gauge.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';

export default function GoalVisType(Private, i18n) {
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createVislibVisualization({
    name: 'goal',
    title: i18n('kbnVislibVisTypes.goal.goalTitle', { defaultMessage: 'Goal' }),
    icon: 'visGoal',
    description: i18n('kbnVislibVisTypes.goal.goalDescription', {
      defaultMessage: 'A goal chart indicates how close you are to your final goal.'
    }),
    category: CATEGORY.DATA,
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
          gaugeType: 'Arc',
          gaugeStyle: 'Full',
          backStyle: 'Full',
          orientation: 'vertical',
          useRanges: false,
          colorSchema: 'Green to Red',
          gaugeColorMode: 'None',
          colorsRange: [
            { from: 0, to: 10000 }
          ],
          invertColors: false,
          labels: {
            show: true,
            color: 'black'
          },
          scale: {
            show: false,
            labels: false,
            color: '#333',
            width: 2
          },
          type: 'meter',
          style: {
            bgFill: '#000',
            bgColor: false,
            labelColor: false,
            subText: '',
            fontSize: 60,
          }
        }
      },
    },
    editorConfig: {
      collections: {
        gaugeTypes: ['Arc', 'Circle'],
        gaugeColorMode: ['None', 'Labels', 'Background'],
        scales: ['linear', 'log', 'square root'],
        colorSchemas: Object.keys(vislibColorMaps),
      },
      optionsTemplate: gaugeTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n('kbnVislibVisTypes.goal.metricTitle', { defaultMessage: 'Metric' }),
          min: 1,
          aggFilter: [
            '!std_dev', '!geo_centroid', '!percentiles', '!percentile_ranks',
            '!derivative', '!serial_diff', '!moving_avg', '!cumulative_sum', '!geo_bounds'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'group',
          title: i18n('kbnVislibVisTypes.goal.groupTitle', { defaultMessage: 'Split Group' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!filter']
        }
      ])
    },
    useCustomNoDataScreen: true
  });
}
