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
import './table_vis_controller';
import './table_vis_params';
import 'ui/agg_table';
import 'ui/agg_table/agg_table_group';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import tableVisTemplate from './table_vis.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { legacyTableResponseHandler } from './legacy_response_handler';

// we need to load the css ourselves

// we also need to load the controller and used by the template

// our params are a bit complex so we will manage them with a directive

// require the directives that we use as well

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(TableVisTypeProvider);

// define the TableVisType
function TableVisTypeProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // define the TableVisController which is used in the template
  // by angular's ng-controller directive

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createAngularVisualization({
    type: 'table',
    name: 'table',
    title: i18n.translate('tableVis.tableVisTitle', {
      defaultMessage: 'Data Table',
    }),
    icon: 'visTable',
    description: i18n.translate('tableVis.tableVisDescription', {
      defaultMessage: 'Display values in a table',
    }),
    visConfig: {
      defaults: {
        perPage: 10,
        showPartialRows: false,
        showMetricsAtAllLevels: false,
        sort: {
          columnIndex: null,
          direction: null
        },
        showTotal: false,
        totalFunc: 'sum'
      },
      template: tableVisTemplate,
    },
    editorConfig: {
      optionsTemplate: '<table-vis-params></table-vis-params>',
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.metricTitle', {
            defaultMessage: 'Metric',
          }),
          aggFilter: ['!geo_centroid', '!geo_bounds'],
          min: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.bucketTitle', {
            defaultMessage: 'Split Rows',
          }),
          aggFilter: ['!filter']
        },
        {
          group: 'buckets',
          name: 'split',
          title: i18n.translate('tableVis.tableVisEditorConfig.schemas.splitTitle', {
            defaultMessage: 'Split Table',
          }),
          aggFilter: ['!filter']
        }
      ])
    },
    responseHandler: legacyTableResponseHandler,
    responseHandlerConfig: {
      asAggConfigResults: true
    },
    hierarchicalData: function (vis) {
      return Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels);
    }
  });
}

export default TableVisTypeProvider;
