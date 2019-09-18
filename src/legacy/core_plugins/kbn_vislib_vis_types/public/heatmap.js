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

import { visFactory } from '../../../ui/public/vis/vis_factory';
import { i18n } from '@kbn/i18n';
import { Schemas } from 'ui/vis/editors/default/schemas';
import heatmapTemplate from './editors/heatmap.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { vislibVisController } from './controller';
import './controls/heatmap_options';

export default function HeatmapVisType() {

  return visFactory.createBaseVisualization({
    name: 'heatmap',
    title: i18n.translate('kbnVislibVisTypes.heatmap.heatmapTitle', { defaultMessage: 'Heat Map' }),
    icon: 'visHeatmap',
    description: i18n.translate('kbnVislibVisTypes.heatmap.heatmapDescription', { defaultMessage: 'Shade cells within a matrix' }),
    visualization: vislibVisController,
    visConfig: {
      defaults: {
        type: 'heatmap',
        addTooltip: true,
        addLegend: true,
        enableHover: false,
        legendPosition: 'right',
        times: [],
        colorsNumber: 4,
        colorSchema: 'Greens',
        setColorRange: false,
        colorsRange: [],
        invertColors: false,
        percentageMode: false,
        valueAxes: [{
          show: false,
          id: 'ValueAxis-1',
          type: 'value',
          scale: {
            type: 'linear',
            defaultYExtents: false,
          },
          labels: {
            show: false,
            rotate: 0,
            overwriteColor: false,
            color: 'black',
          }
        }]
      },
    },
    events: {
      brush: { disabled: false },
    },
    editorConfig: {
      collections: {
        legendPositions: [{
          value: 'left',
          text: 'left',
        }, {
          value: 'right',
          text: 'right',
        }, {
          value: 'top',
          text: 'top',
        }, {
          value: 'bottom',
          text: 'bottom',
        }],
        scales: ['linear', 'log', 'square root'],
        colorSchemas: Object.values(vislibColorMaps).map(value => ({ id: value.id, label: value.label })),
      },
      optionsTemplate: heatmapTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('kbnVislibVisTypes.heatmap.metricTitle', { defaultMessage: 'Value' }),
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'median', 'sum', 'min', 'max', 'cardinality', 'std_dev', 'top_hits'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          title: i18n.translate('kbnVislibVisTypes.heatmap.segmentTitle', { defaultMessage: 'X-axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: 'buckets',
          name: 'group',
          title: i18n.translate('kbnVislibVisTypes.heatmap.groupTitle', { defaultMessage: 'Y-axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        },
        {
          group: 'buckets',
          name: 'split',
          title: i18n.translate('kbnVislibVisTypes.heatmap.splitTitle', { defaultMessage: 'Split chart' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        }
      ])
    }

  });
}
