/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { TSVB_EDITOR_NAME } from './application/editor_controller';
import { PANEL_TYPES, TOOLTIP_MODES } from '../common/enums';
import { isStringTypeIndexPattern } from '../common/index_patterns_utils';
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
      id: uuid(),
      type: PANEL_TYPES.TIMESERIES,
      series: [
        {
          id: uuid(),
          color: '#68BC00',
          split_mode: 'everything',
          palette: {
            type: 'palette',
            name: 'default',
          },
          metrics: [
            {
              id: uuid(),
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
      use_kibana_indexes: true,
      interval: '',
      axis_position: 'left',
      axis_formatter: 'number',
      axis_scale: 'normal',
      show_legend: 1,
      show_grid: 1,
      tooltip_mode: TOOLTIP_MODES.SHOW_ALL,
      drop_last_bucket: 0,
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
    return [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush];
  },
  inspectorAdapters: {},
  getUsedIndexPattern: async (params: VisParams) => {
    const { indexPatterns } = getDataStart();
    const indexPatternValue = params.index_pattern;

    if (indexPatternValue) {
      if (isStringTypeIndexPattern(indexPatternValue)) {
        return await indexPatterns.find(indexPatternValue);
      }

      if (indexPatternValue.id) {
        return [await indexPatterns.get(indexPatternValue.id)];
      }
    }

    const defaultIndex = await indexPatterns.getDefault();

    return defaultIndex ? [defaultIndex] : [];
  },
};
