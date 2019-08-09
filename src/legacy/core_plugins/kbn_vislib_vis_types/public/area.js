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
import { PointSeriesOptions } from './editors/point_series';
import { getLegendPositions, LegendPositions } from './utils/legend_positions';

export default function PointSeriesVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createVislibVisualization({
    name: 'area',
    title: i18n.translate('kbnVislibVisTypes.area.areaTitle', { defaultMessage: 'Area' }),
    icon: 'visArea',
    description: i18n.translate(
      'kbnVislibVisTypes.area.areaDescription', { defaultMessage: 'Emphasize the quantity beneath a line chart' }),
    visConfig: {
      defaults: {
        type: 'area',
        grid: {
          categoryLines: false,
        },
        categoryAxes: [
          {
            id: 'CategoryAxis-1',
            type: 'category',
            position: 'bottom',
            show: true,
            style: {},
            scale: {
              type: 'linear'
            },
            labels: {
              show: true,
              filter: true,
              truncate: 100
            },
            title: {}
          }
        ],
        valueAxes: [
          {
            id: 'ValueAxis-1',
            name: 'LeftAxis-1',
            type: 'value',
            position: 'left',
            show: true,
            style: {},
            scale: {
              type: 'linear',
              mode: 'normal'
            },
            labels: {
              show: true,
              rotate: 0,
              filter: false,
              truncate: 100
            },
            title: {
              text: 'Count'
            }
          }
        ],
        seriesParams: [{
          show: 'true',
          type: 'area',
          mode: 'stacked',
          data: {
            label: 'Count',
            id: '1'
          },
          drawLinesBetweenPoints: true,
          showCircles: true,
          interpolate: 'linear',
          valueAxis: 'ValueAxis-1'
        }],
        addTooltip: true,
        addLegend: true,
        legendPosition: LegendPositions.RIGHT,
        times: [],
        addTimeMarker: false,
        labels: {},
      },
    },
    editorConfig: {
      collections: {
        legendPositions: getLegendPositions(),
        positions: ['top', 'left', 'right', 'bottom'],
        chartTypes: [{
          value: 'line',
          text: 'line'
        }, {
          value: 'area',
          text: 'area'
        }, {
          value: 'histogram',
          text: 'bar'
        }],
        axisModes: ['normal', 'percentage', 'wiggle', 'silhouette'],
        scaleTypes: ['linear', 'log', 'square root'],
        chartModes: ['normal', 'stacked'],
        interpolationModes: [{
          value: 'linear',
          text: 'straight',
        }, {
          value: 'cardinal',
          text: 'smoothed',
        }, {
          value: 'step-after',
          text: 'stepped',
        }],
      },
      optionTabs: [
        {
          name: 'advanced',
          title: 'Metrics & Axes',
          editor: '<div><vislib-series></vislib-series><vislib-value-axes>' +
          '</vislib-value-axes><vislib-category-axis></vislib-category-axis></div>'
        },
        { name: 'options', title: 'Panel Settings', editor: PointSeriesOptions },
      ],
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('kbnVislibVisTypes.area.metricsTitle', { defaultMessage: 'Y-axis' }),
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          min: 1,
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'metrics',
          name: 'radius',
          title: i18n.translate('kbnVislibVisTypes.area.radiusTitle', { defaultMessage: 'Dot size' }),
          min: 0,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality']
        },
        {
          group: 'buckets',
          name: 'segment',
          title: i18n.translate('kbnVislibVisTypes.area.segmentTitle', { defaultMessage: 'X-axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: 'buckets',
          name: 'group',
          title: i18n.translate('kbnVislibVisTypes.area.groupTitle', { defaultMessage: 'Split series' }),
          min: 0,
          max: 3,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: 'buckets',
          name: 'split',
          title: i18n.translate('kbnVislibVisTypes.area.splitTitle', { defaultMessage: 'Split chart' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        }
      ])
    }
  });
}
