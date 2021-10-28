/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { AggGroupNames } from '../../../data/public';
import { VIS_EVENT_TO_TRIGGER, VisTypeDefinition } from '../../../visualizations/public';
import { TableVisParams, VIS_TYPE_TABLE } from '../common';
import { TableOptions } from './components/table_vis_options_lazy';
import { toExpressionAst } from './to_ast';

export const tableVisTypeDefinition: VisTypeDefinition<TableVisParams> = {
  name: VIS_TYPE_TABLE,
  title: i18n.translate('visTypeTable.tableVisTitle', {
    defaultMessage: 'Data table',
  }),
  icon: 'visTable',
  description: i18n.translate('visTypeTable.tableVisDescription', {
    defaultMessage: 'Display data in rows and columns.',
  }),
  getSupportedTriggers: () => {
    return [VIS_EVENT_TO_TRIGGER.filter];
  },
  visConfig: {
    defaults: {
      perPage: 10,
      showPartialRows: false,
      showMetricsAtAllLevels: false,
      showTotal: false,
      showToolbar: false,
      totalFunc: 'sum',
      percentageCol: '',
      autoFitRowToContent: false,
    },
  },
  editorConfig: {
    optionsTemplate: TableOptions,
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypeTable.tableVisEditorConfig.schemas.metricTitle', {
          defaultMessage: 'Metric',
        }),
        aggFilter: ['!geo_centroid', '!geo_bounds', '!filtered_metric', '!single_percentile'],
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
    ],
  },
  toExpressionAst,
  hierarchicalData: (vis) => vis.params.showPartialRows || vis.params.showMetricsAtAllLevels,
  requiresSearch: true,
};
