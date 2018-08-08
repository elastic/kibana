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

import './metric_vis.less';
import './metric_vis_params';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { MetricVisComponent } from './metric_vis_controller';
import image from './images/icon-number.svg';
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
    title: 'Metric',
    image,
    description: 'Display a calculation as a single number',
    category: CATEGORY.DATA,
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
        metricColorMode: ['None', 'Labels', 'Background'],
        colorSchemas: Object.keys(vislibColorMaps),
      },
      optionsTemplate: '<metric-vis-params></metric-vis-params>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
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
          title: 'Split Group',
          min: 0,
          max: 1,
          aggFilter: ['!geohash_grid', '!filter']
        }
      ])
    },
  });
}

// export the provider so that the visType can be required with Private()
export default MetricVisProvider;
