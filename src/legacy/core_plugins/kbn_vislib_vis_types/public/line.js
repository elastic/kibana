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
import { Schemas, AggGroupNames } from 'ui/vis/editors/default';
import { PointSeriesOptions } from './editors/point_series_options';
import { MetricsAxisOptions } from './editors/metrics_axes_options';
import {
  getPositions,
  LegendPositions,
  getChartTypes,
  ChartTypes,
  getChartModes,
  ChartModes,
  getInterpolationModes,
  AxisTypes,
  ScaleTypes,
  AxisModes,
  Rotates,
  getAxisModes,
  getScaleTypes,
  getThresholdLineStyles,
  ThresholdLineStyles,
} from './utils/collections';
import { palettes } from '@elastic/eui/lib/services';

export default function PointSeriesVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createVislibVisualization({
    name: 'line',
    title: i18n.translate('kbnVislibVisTypes.line.lineTitle', { defaultMessage: 'Line' }),
    icon: 'visLine',
    description: i18n.translate('kbnVislibVisTypes.line.lineDescription', { defaultMessage: 'Emphasize trends' }),
    visConfig: {
      defaults: {
        type: 'line',
        grid: {
          categoryLines: false,
        },
        categoryAxes: [
          {
            id: 'CategoryAxis-1',
            type: AxisTypes.CATEGORY,
            position: LegendPositions.BOTTOM,
            show: true,
            style: {},
            scale: {
              type: ScaleTypes.LINEAR
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
            type: AxisTypes.VALUE,
            position: LegendPositions.LEFT,
            show: true,
            style: {},
            scale: {
              type: ScaleTypes.LINEAR,
              mode: AxisModes.NORMAL,
            },
            labels: {
              show: true,
              rotate: Rotates.HORIZONTAL,
              filter: false,
              truncate: 100
            },
            title: {
              text: 'Count'
            }
          }
        ],
        seriesParams: [
          {
            show: true,
            type: ChartTypes.LINE,
            mode: ChartModes.NORMAL,
            data: {
              label: 'Count',
              id: '1'
            },
            valueAxis: 'ValueAxis-1',
            drawLinesBetweenPoints: true,
            showCircles: true
          }
        ],
        addTooltip: true,
        addLegend: true,
        legendPosition: LegendPositions.RIGHT,
        times: [],
        addTimeMarker: false,
        labels: {},
        thresholdLine: {
          show: false,
          value: 10,
          width: 1,
          style: ThresholdLineStyles.FULL,
          color: palettes.euiPaletteColorBlind.colors[9]
        }
      },
    },
    editorConfig: {
      collections: {
        legendPositions: getPositions(),
        positions: getPositions(),
        chartTypes: getChartTypes(),
        axisModes: getAxisModes(),
        scaleTypes: getScaleTypes(),
        chartModes: getChartModes(),
        interpolationModes: getInterpolationModes(),
        thresholdLineStyles: getThresholdLineStyles(),
      },
      optionTabs: [
        {
          name: 'advanced',
          title: i18n.translate('kbnVislibVisTypes.line.tabs.metricsAxesTitle', {
            defaultMessage: 'Metrics & axes',
          }),
          editor: MetricsAxisOptions,
        },
        {
          name: 'options',
          title: i18n.translate('kbnVislibVisTypes.line.tabs.panelSettingsTitle', {
            defaultMessage: 'Panel settings',
          }),
          editor: PointSeriesOptions,
        },
      ],
      schemas: new Schemas([
        {
          group: AggGroupNames.Metrics,
          name: 'metric',
          title: i18n.translate('kbnVislibVisTypes.line.metricTitle', { defaultMessage: 'Y-axis' }),
          min: 1,
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: AggGroupNames.Metrics,
          name: 'radius',
          title: i18n.translate('kbnVislibVisTypes.line.radiusTitle', { defaultMessage: 'Dot size' }),
          min: 0,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'segment',
          title: i18n.translate('kbnVislibVisTypes.line.segmentTitle', { defaultMessage: 'X-axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'group',
          title: i18n.translate('kbnVislibVisTypes.line.groupTitle', { defaultMessage: 'Split series' }),
          min: 0,
          max: 3,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'split',
          title: i18n.translate('kbnVislibVisTypes.line.splitTitle', { defaultMessage: 'Split chart' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        }
      ])
    }
  });
}
