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

import './tag_cloud.less';
import './tag_cloud_vis_params';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { TagCloudVisualization } from './tag_cloud_visualization';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import image from './images/icon-tagcloud.svg';
import { Status } from 'ui/vis/update_status';

VisTypesRegistryProvider.register(function (Private) {

  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createBaseVisualization({
    name: 'tagcloud',
    title: 'Tag Cloud',
    image,
    description: 'A group of words, sized according to their importance',
    category: CATEGORY.OTHER,
    visConfig: {
      defaults: {
        scale: 'linear',
        orientation: 'single',
        minFontSize: 18,
        maxFontSize: 72,
        showLabel: true
      }
    },
    requiresUpdateStatus: [Status.PARAMS, Status.RESIZE, Status.DATA],
    visualization: TagCloudVisualization,
    responseHandler: 'tabify',
    editorConfig: {
      collections: {
        scales: ['linear', 'log', 'square root'],
        orientations: ['single', 'right angled', 'multiple'],
      },
      optionsTemplate: '<tagcloud-vis-params></tagcloud-vis-params>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Tag Size',
          min: 1,
          max: 1,
          aggFilter: ['!std_dev', '!percentiles', '!percentile_ranks', '!derivative', '!geo_bounds', '!geo_centroid'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-cloud',
          title: 'Tags',
          min: 1,
          max: 1,
          aggFilter: ['terms', 'significant_terms']
        }
      ])
    }
  });
});
