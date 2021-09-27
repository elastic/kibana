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
import { TSVB_DEFAULT_COLOR } from '../common/constants';
import { toExpressionAst } from './to_ast';
import {
  Vis,
  VIS_EVENT_TO_TRIGGER,
  VisGroups,
  VisParams,
  VisTypeDefinition,
} from '../../../visualizations/public';
import { getDataStart } from './services';
import type { TimeseriesVisDefaultParams, TimeseriesVisParams } from './types';

export const withReplacedIds = (
  vis: Vis<TimeseriesVisParams | TimeseriesVisDefaultParams>
): Vis<TimeseriesVisParams> => {
  const doReplace = (
    obj: Partial<{
      id: string | (() => string);
    }>
  ) => {
    if (typeof obj?.id === 'function') {
      obj.id = obj.id();
    }
  };

  doReplace(vis.params);

  vis.params.series?.forEach((series) => {
    doReplace(series);
    series.metrics?.forEach((metric) => doReplace(metric));
  });

  return vis;
};

export const metricsVisDefinition: VisTypeDefinition<
  TimeseriesVisParams | TimeseriesVisDefaultParams
> = {
  name: 'metrics',
  title: i18n.translate('visTypeTimeseries.kbnVisTypes.metricsTitle', { defaultMessage: 'TSVB' }),
  description: i18n.translate('visTypeTimeseries.kbnVisTypes.metricsDescription', {
    defaultMessage: 'Perform advanced analysis of your time series data.',
  }),
  icon: 'visVisualBuilder',
  group: VisGroups.PROMOTED,
  visConfig: {
    defaults: {
      id: () => uuid(),
      type: PANEL_TYPES.TIMESERIES,
      series: [
        {
          id: () => uuid(),
          color: TSVB_DEFAULT_COLOR,
          split_mode: 'everything',
          palette: {
            type: 'palette',
            name: 'default',
          },
          metrics: [
            {
              id: () => uuid(),
              type: 'count',
            },
          ],
          separate_axis: 0,
          axis_position: 'right',
          formatter: 'default',
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
      truncate_legend: 1,
      max_lines_legend: 1,
      show_grid: 1,
      tooltip_mode: TOOLTIP_MODES.SHOW_ALL,
      drop_last_bucket: 0,
    },
  },
  setup: (vis) => Promise.resolve(withReplacedIds(vis)),
  editorConfig: {
    editor: TSVB_EDITOR_NAME,
  },
  options: {
    showQueryBar: true,
    showFilterBar: true,
    showIndexSelection: false,
  },
  toExpressionAst,
  getSupportedTriggers: (params?: VisParams) => {
    if (params?.type === PANEL_TYPES.TIMESERIES) {
      return [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush];
    }
    return [];
  },
  inspectorAdapters: {},
  requiresSearch: true,
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
