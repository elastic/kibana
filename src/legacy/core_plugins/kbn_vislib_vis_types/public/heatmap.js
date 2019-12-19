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
import { Schemas } from 'ui/vis/editors/default/schemas';
import { AggGroupNames } from 'ui/vis/editors/default';
import { ColorSchemas } from 'ui/color_maps';
import { AxisTypes, getHeatmapCollections, Positions, ScaleTypes } from './utils/collections';
import { HeatmapOptions } from './components/options';
import { vislibVisController } from './controller';

export const heatmapDefinition = {
  name: 'heatmap',
  title: i18n.translate('kbnVislibVisTypes.heatmap.heatmapTitle', { defaultMessage: 'Heat Map' }),
  icon: 'visHeatmap',
  description: i18n.translate('kbnVislibVisTypes.heatmap.heatmapDescription', {
    defaultMessage: 'Shade cells within a matrix',
  }),
  visualization: vislibVisController,
  visConfig: {
    defaults: {
      type: 'heatmap',
      addTooltip: true,
      addLegend: true,
      enableHover: false,
      legendPosition: Positions.RIGHT,
      times: [],
      colorsNumber: 4,
      colorSchema: ColorSchemas.Greens,
      setColorRange: false,
      colorsRange: [],
      invertColors: false,
      percentageMode: false,
      valueAxes: [
        {
          show: false,
          id: 'ValueAxis-1',
          type: AxisTypes.VALUE,
          scale: {
            type: ScaleTypes.LINEAR,
            defaultYExtents: false,
          },
          labels: {
            show: false,
            rotate: 0,
            overwriteColor: false,
            color: 'black',
          },
        },
      ],
    },
  },
  events: {
    brush: { disabled: false },
  },
  editorConfig: {
    collections: getHeatmapCollections(),
    optionsTemplate: HeatmapOptions,
    schemas: new Schemas([
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('kbnVislibVisTypes.heatmap.metricTitle', { defaultMessage: 'Value' }),
        min: 1,
        max: 1,
        aggFilter: [
          'count',
          'avg',
          'median',
          'sum',
          'min',
          'max',
          'cardinality',
          'std_dev',
          'top_hits',
        ],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('kbnVislibVisTypes.heatmap.segmentTitle', {
          defaultMessage: 'X-axis',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'group',
        title: i18n.translate('kbnVislibVisTypes.heatmap.groupTitle', { defaultMessage: 'Y-axis' }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('kbnVislibVisTypes.heatmap.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!geohash_grid', '!geotile_grid', '!filter'],
      },
    ]),
  },
};
