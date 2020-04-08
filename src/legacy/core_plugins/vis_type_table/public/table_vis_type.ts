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
import { AggGroupNames } from '../../../../plugins/data/public';
import { Schemas } from '../../../../plugins/vis_default_editor/public';
import { Vis } from '../../../../plugins/visualizations/public';
import { tableVisResponseHandler } from './table_vis_response_handler';
// @ts-ignore
import tableVisTemplate from './table_vis.html';
import { TableOptions } from './components/table_vis_options';
import { TableVisualizationController } from './vis_controller';

export const tableVisTypeDefinition = {
  type: 'table',
  name: 'table',
  title: i18n.translate('visTypeTable.tableVisTitle', {
    defaultMessage: 'Data Table',
  }),
  icon: 'visTable',
  description: i18n.translate('visTypeTable.tableVisDescription', {
    defaultMessage: 'Display values in a table',
  }),
  visualization: TableVisualizationController,
  visConfig: {
    defaults: {
      perPage: 10,
      showPartialRows: false,
      showMetricsAtAllLevels: false,
      sort: {
        columnIndex: null,
        direction: null,
      },
      showTotal: false,
      totalFunc: 'sum',
      percentageCol: '',
    },
    template: tableVisTemplate,
  },
  editorConfig: {
    optionsTemplate: TableOptions,
    schemas: new Schemas([
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.metricTitle', {
          defaultMessage: 'Metric',
        }),
        aggFilter: ['!geo_centroid', '!geo_bounds'],
        aggSettings: {
          top_hits: {
            allowStrings: true,
          },
        },
        min: 1,
        defaults: [{ type: 'count', schema: 'metric' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'bucket',
        title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.bucketTitle', {
          defaultMessage: 'Split rows',
        }),
        aggFilter: ['!filter'],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.splitTitle', {
          defaultMessage: 'Split table',
        }),
        min: 0,
        max: 1,
        aggFilter: ['!filter'],
      },
    ]),
  },
  responseHandler: tableVisResponseHandler,
  hierarchicalData: (vis: Vis) => {
    return Boolean(vis.params.showPartialRows || vis.params.showMetricsAtAllLevels);
  },
};
