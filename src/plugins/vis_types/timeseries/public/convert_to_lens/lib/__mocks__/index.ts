/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Series } from '../../../../common/types';

export const createSeries = (partialSeries?: Partial<Series>): Series => ({
  axis_position: 'right',
  chart_type: 'line',
  color: '#68BC00',
  fill: '0.5',
  formatter: 'default',
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
