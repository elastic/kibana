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
import heatmapTemplate from './editors/heatmap.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';

export default function HeatmapVisType(Private, i18n) {
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createVislibVisualization({
    name: 'heatmap',
    title: i18n('kbnVislibVisTypes.heatmap.heatmapTitle', { defaultMessage: 'Heat Map' }),
    icon: 'visHeatmap',
    description: i18n('kbnVislibVisTypes.heatmap.heatmapDescription', { defaultMessage: 'Shade cells within a matrix' }),
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
            color: '#555',
          }
        }]
      },
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
          title: i18n('kbnVislibVisTypes.heatmap.metricTitle', { defaultMessage: 'Value' }),
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
          title: i18n('kbnVislibVisTypes.heatmap.segmentTitle', { defaultMessage: 'X-Axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!filter']
        },
        {
          group: 'buckets',
          name: 'group',
          title: i18n('kbnVislibVisTypes.heatmap.groupTitle', { defaultMessage: 'Y-Axis' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!filter']
        },
        {
          group: 'buckets',
          name: 'split',
          title: i18n('kbnVislibVisTypes.heatmap.splitTitle', { defaultMessage: 'Split Chart' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!filter']
        }
      ])
    }

  });
}
