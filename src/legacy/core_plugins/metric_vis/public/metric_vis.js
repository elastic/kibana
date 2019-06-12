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

import './metric_vis_params';
import { i18n } from '@kbn/i18n';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { MetricVisComponent } from './metric_vis_controller';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(MetricVisProvider);

function MetricVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createReactVisualization({
    name: 'metric',
    title: i18n.translate('metricVis.metricTitle', { defaultMessage: 'Metric' }),
    icon: 'visMetric',
    description: i18n.translate('metricVis.metricDescription', { defaultMessage: 'Display a calculation as a single number' }),
    visConfig: {
      component: MetricVisComponent,
      defaults: {
        addTooltip: true,
        addLegend: false,
        type: 'metric',
        metric: {
          percentageMode: false,
          useRanges: false,
          colorSchema: 'Green to Red',
          metricColorMode: 'None',
          colorsRange: [
            { from: 0, to: 10000 }
          ],
          labels: {
            show: true
          },
          invertColors: false,
          style: {
            bgFill: '#000',
            bgColor: false,
            labelColor: false,
            subText: '',
            fontSize: 60,
          }
        }
      }
    },
    editorConfig: {
      collections: {
        metricColorMode: [
          {
            id: 'None',
            label: i18n.translate('metricVis.colorModes.noneOptionLabel', { defaultMessage: 'None' })
          },
          {
            id: 'Labels',
            label: i18n.translate('metricVis.colorModes.labelsOptionLabel', { defaultMessage: 'Labels' })
          },
          {
            id: 'Background',
            label: i18n.translate('metricVis.colorModes.backgroundOptionLabel', { defaultMessage: 'Background' })
          }
        ],
        colorSchemas: Object.values(vislibColorMaps).map(value => ({ id: value.id, label: value.label })),
      },
      optionsTemplate: '<metric-vis-params></metric-vis-params>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('metricVis.schemas.metricTitle', { defaultMessage: 'Metric' }),
          min: 1,
          aggFilter: [
            '!std_dev', '!geo_centroid',
            '!derivative', '!serial_diff', '!moving_avg', '!cumulative_sum', '!geo_bounds'],
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        }, {
          group: 'buckets',
          name: 'group',
          title: i18n.translate('metricVis.schemas.splitGroupTitle', { defaultMessage: 'Split Group' }),
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!geotile_grid', '!filter']
        }
      ])
    }
  });
}

// export the provider so that the visType can be required with Private()
export default MetricVisProvider;
