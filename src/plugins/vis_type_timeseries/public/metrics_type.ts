/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { TSVB_EDITOR_NAME } from './application';
import { PANEL_TYPES } from '../common/panel_types';
import { toExpressionAst } from './to_ast';
import { VIS_EVENT_TO_TRIGGER, VisGroups, VisParams } from '../../visualizations/public';
import { getDataStart } from './services';

export const metricsVisDefinition = {
  name: 'metrics',
  title: i18n.translate('visTypeTimeseries.kbnVisTypes.metricsTitle', { defaultMessage: 'TSVB' }),
  description: i18n.translate('visTypeTimeseries.kbnVisTypes.metricsDescription', {
    defaultMessage: 'Perform advanced analysis of your time series data.',
  }),
  icon: 'visVisualBuilder',
  group: VisGroups.PROMOTED,
  visConfig: {
    defaults: {
      id: '61ca57f0-469d-11e7-af02-69e470af7417',
      type: PANEL_TYPES.TIMESERIES,
      series: [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417',
          color: '#68BC00',
          split_mode: 'everything',
          split_color_mode: 'kibana',
          metrics: [
            {
              id: '61ca57f2-469d-11e7-af02-69e470af7417',
              type: 'count',
            },
          ],
          separate_axis: 0,
          axis_position: 'right',
          formatter: 'number',
          chart_type: 'line',
          line_width: 1,
          point_size: 1,
          fill: 0.5,
          stacked: 'none',
        },
      ],
      time_field: '',
      index_pattern: '',
      interval: '',
      axis_position: 'left',
      axis_formatter: 'number',
      axis_scale: 'normal',
      show_legend: 1,
      show_grid: 1,
      tooltip_mode: 'show_all',
    },
  },
  editorConfig: {
    editor: TSVB_EDITOR_NAME,
  },
  options: {
    showQueryBar: false,
    showFilterBar: false,
    showIndexSelection: false,
  },
  toExpressionAst,
  getSupportedTriggers: () => {
    return [VIS_EVENT_TO_TRIGGER.applyFilter];
  },
  inspectorAdapters: {},
  getUsedIndexPattern: async (params: VisParams) => {
    const { indexPatterns } = getDataStart();

    return params.index_pattern ? await indexPatterns.find(params.index_pattern) : [];
  },
};
