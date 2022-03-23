/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import type { DataViewsContract, DataView } from 'src/plugins/data_views/public';
import { TSVB_EDITOR_NAME } from './application/editor_controller';
import { PANEL_TYPES, TOOLTIP_MODES } from '../common/enums';
import {
  extractIndexPatternValues,
  isStringTypeIndexPattern,
} from '../common/index_patterns_utils';
import { TSVB_DEFAULT_COLOR } from '../common/constants';
import { toExpressionAst } from './to_ast';
import {
  Vis,
  VIS_EVENT_TO_TRIGGER,
  VisGroups,
  VisParams,
  VisTypeDefinition,
} from '../../../visualizations/public';
import { getDataViewsStart } from './services';
import type { TimeseriesVisDefaultParams, TimeseriesVisParams } from './types';
import type { IndexPatternValue, Panel } from '../common/types';
import { RequestAdapter } from '../../../inspector/public';

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

async function withDefaultIndexPattern(
  vis: Vis<TimeseriesVisParams | TimeseriesVisDefaultParams>
): Promise<Vis<TimeseriesVisParams>> {
  const dataViews = getDataViewsStart();

  const defaultIndex = await dataViews.getDefault();
  if (!defaultIndex || !defaultIndex.id || vis.params.index_pattern) return vis;
  vis.params.index_pattern = {
    id: defaultIndex.id,
  };
  return vis;
}

async function resolveIndexPattern(
  indexPatternValue: IndexPatternValue,
  indexPatterns: DataViewsContract
) {
  if (!indexPatternValue) return;
  if (isStringTypeIndexPattern(indexPatternValue)) {
    return await indexPatterns.find(indexPatternValue);
  }

  if (indexPatternValue.id) {
    return [await indexPatterns.get(indexPatternValue.id)];
  }
}

async function getUsedIndexPatterns(params: VisParams): Promise<DataView[]> {
  const dataViews = getDataViewsStart();

  const defaultIndex = await dataViews.getDefault();
  const resolvedIndexPatterns: DataView[] = [];
  const indexPatternValues = extractIndexPatternValues(params as Panel, defaultIndex?.id);
  (
    await Promise.all(
      indexPatternValues.map((indexPatternValue) =>
        resolveIndexPattern(indexPatternValue, dataViews)
      )
    )
  ).forEach((patterns) => patterns && resolvedIndexPatterns.push(...patterns));
  return resolvedIndexPatterns;
}

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
          override_index_pattern: 0,
          series_drop_last_bucket: 0,
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
  setup: (vis) => withDefaultIndexPattern(withReplacedIds(vis)),
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
  navigateToLens: async (params?: VisParams) => {
    const { triggerTSVBtoLensConfiguration } = await import('./trigger_action');

    const triggerConfiguration = params
      ? await triggerTSVBtoLensConfiguration(params as Panel)
      : null;
    return triggerConfiguration;
  },
  inspectorAdapters: () => ({
    requests: new RequestAdapter(),
  }),
  requiresSearch: true,
  getUsedIndexPattern: getUsedIndexPatterns,
};
