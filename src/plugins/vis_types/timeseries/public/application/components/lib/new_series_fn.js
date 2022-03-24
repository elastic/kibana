/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import _ from 'lodash';
import { newMetricAggFn } from './new_metric_agg_fn';
import { STACKED_OPTIONS } from '../../visualizations/constants';

export const newSeriesFn = (obj = {}) => {
  return _.assign(
    {
      id: uuid.v1(),
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
