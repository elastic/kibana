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
import { AggGroupNames } from 'ui/vis/editors/default';
import {
  Positions,
  ChartTypes,
  ChartModes,
  InterpolationModes,
  AxisTypes,
  ScaleTypes,
  AxisModes,
  Rotates,
  ThresholdLineStyles,
  getConfigCollections,
} from './utils/collections';
import { getAreaOptionTabs, getCountLabel } from './utils/common_config';
import { palettes } from '@elastic/eui/lib/services';

export default function PointSeriesVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const countLabel = getCountLabel();

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
            type: AxisTypes.CATEGORY,
            position: Positions.BOTTOM,
            show: true,
            style: {},
            scale: {
              type: ScaleTypes.LINEAR,
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
            position: Positions.LEFT,
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
              text: countLabel
            }
          }
        ],
        seriesParams: [
          {
            show: true,
            type: ChartTypes.AREA,
            mode: ChartModes.STACKED,
            data: {
              label: countLabel,
              id: '1'
            },
            drawLinesBetweenPoints: true,
            lineWidth: 2,
            showCircles: true,
            interpolate: InterpolationModes.LINEAR,
            valueAxis: 'ValueAxis-1',
          }
        ],
        addTooltip: true,
        addLegend: true,
        legendPosition: Positions.RIGHT,
        times: [],
        addTimeMarker: false,
        thresholdLine: {
          show: false,
          value: 10,
          width: 1,
          style: ThresholdLineStyles.FULL,
          color: palettes.euiPaletteColorBlind.colors[9]
        },
        labels: {}
      },
    },
    editorConfig: {
      collections: getConfigCollections(),
      optionTabs: getAreaOptionTabs(),
      schemas: new Schemas([
        {
          group: AggGroupNames.Metrics,
          name: 'metric',
          title: i18n.translate('kbnVislibVisTypes.area.metricsTitle', { defaultMessage: 'Y-axis' }),
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          min: 1,
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: AggGroupNames.Metrics,
          name: 'radius',
          title: i18n.translate('kbnVislibVisTypes.area.radiusTitle', { defaultMessage: 'Dot size' }),
          min: 0,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'segment',
          title: i18n.translate('kbnVislibVisTypes.area.segmentTitle', { defaultMessage: 'X-axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: AggGroupNames.Buckets,
          name: 'group',
          title: i18n.translate('kbnVislibVisTypes.area.groupTitle', { defaultMessage: 'Split series' }),
          min: 0,
          max: 3,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: AggGroupNames.Buckets,
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
