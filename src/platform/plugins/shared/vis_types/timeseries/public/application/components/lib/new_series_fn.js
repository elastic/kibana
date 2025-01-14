/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import { newMetricAggFn } from './new_metric_agg_fn';
import { STACKED_OPTIONS } from '../../visualizations/constants';

export const newSeriesFn = (obj = {}) => {
  return _.assign(
    {
      id: uuidv4(),
      color: '#68BC00',
      split_mode: 'everything',
      palette: {
        type: 'palette',
        name: 'default',
      },
      metrics: [newMetricAggFn()],
      separate_axis: 0,
      axis_position: 'right',
      formatter: 'default',
      chart_type: 'line',
      line_width: 1,
      point_size: 1,
      fill: 0.5,
      stacked: STACKED_OPTIONS.NONE,
      override_index_pattern: 0,
      series_drop_last_bucket: 0,
    },
    obj
  );
};
