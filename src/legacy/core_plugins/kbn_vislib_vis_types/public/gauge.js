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
import { i18n } from '@kbn/i18n';
import { Schemas } from 'ui/vis/editors/default/schemas';
import gaugeTemplate from './editors/gauge.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';

export default function GaugeVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createVislibVisualization({
    name: 'gauge',
    title: i18n.translate('kbnVislibVisTypes.gauge.gaugeTitle', { defaultMessage: 'Gauge' }),
    icon: 'visGauge',
    description: i18n.translate('kbnVislibVisTypes.gauge.gaugeDescription', {
      defaultMessage: 'Gauges indicate the status of a metric. Use it to show how a metric\'s value relates to reference threshold values.'
    }),
    visConfig: {
      defaults: {
        type: 'gauge',
        addTooltip: true,
        addLegend: true,
        isDisplayWarning: false,
        gauge: {
          alignment: 'automatic',
          extendRange: true,
          percentageMode: false,
          gaugeType: 'Arc',
          gaugeStyle: 'Full',
          backStyle: 'Full',
          orientation: 'vertical',
          colorSchema: 'Green to Red',
          gaugeColorMode: 'Labels',
          colorsRange: [
            { from: 0, to: 50 },
            { from: 50, to: 75 },
            { from: 75, to: 100 }
          ],
          invertColors: false,
          labels: {
            show: true,
            color: 'black'
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
          }
        }
      },
    },
    events: {
      brush: { disabled: true },
    },
    editorConfig: {
      collections: {
        gaugeTypes: ['Arc', 'Circle'],
        gaugeColorMode: ['None', 'Labels', 'Background'],
        alignments: [
          {
            id: 'automatic',
            label: i18n.translate('kbnVislibVisTypes.gauge.alignmentAutomaticTitle', { defaultMessage: 'Automatic' })
          },
          {
            id: 'horizontal',
            label: i18n.translate('kbnVislibVisTypes.gauge.alignmentHorizontalTitle', { defaultMessage: 'Horizontal' })
          },
          {
            id: 'vertical',
            label: i18n.translate('kbnVislibVisTypes.gauge.alignmentVerticalTitle', { defaultMessage: 'Vertical' }) },
        ],
        scales: ['linear', 'log', 'square root'],
        colorSchemas: Object.values(vislibColorMaps).map(value => ({ id: value.id, label: value.label })),
      },
      optionsTemplate: gaugeTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('kbnVislibVisTypes.gauge.metricTitle', { defaultMessage: 'Metric' }),
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
          title: i18n.translate('kbnVislibVisTypes.gauge.groupTitle', { defaultMessage: 'Split Group' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        }
      ])
    },
    useCustomNoDataScreen: true
  });
}
