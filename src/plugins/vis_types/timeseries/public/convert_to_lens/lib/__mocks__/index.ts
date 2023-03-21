/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PANEL_TYPES } from '../../../../common/enums';
import { Panel, Series } from '../../../../common/types';

export const createSeries = (partialSeries?: Partial<Series>): Series => ({
  axis_position: 'right',
  chart_type: 'line',
  color: '#68BC00',
  fill: '0.5',
  formatter: '',
  id: '3bb3c1d2-5af8-44cc-9759-86725e34b157',
  label: '',
  line_width: 1,
  metrics: [],
  override_index_pattern: 0,
  palette: { name: 'default', type: 'palette' },
  point_size: 1,
  separate_axis: 0,
  series_drop_last_bucket: 0,
  split_mode: 'everything',
  stacked: 'none',
  time_range_mode: 'entire_time_range',
  value_template: '{{value}}',
  seperate_axis: 0,
  series_index_pattern: { id: 'test' },
  series_max_bars: 0,
  steps: 0,
  ...partialSeries,
});

export const createPanel = (parialPanel?: Partial<Panel>): Panel => ({
  annotations: [],
  axis_formatter: '',
  axis_max: 100,
  axis_min: 0,
  axis_position: 'right',
  axis_scale: '',
  bar_color_rules: [],
  drop_last_bucket: 0,
  hide_last_value_indicator: false,
  id: 'some-id',
  ignore_daylight_time: true,
  index_pattern: { id: 'test' },
  interval: '',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  markdown_openLinksInNewTab: 0,
  markdown_scrollbars: 0,
  max_bars: 0,
  series: [createSeries()],
  show_grid: 0,
  show_legend: 0,
  type: PANEL_TYPES.TIMESERIES,
  ...parialPanel,
});
