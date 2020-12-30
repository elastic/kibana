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
      metrics: [newMetricAggFn()],
      separate_axis: 0,
      axis_position: 'right',
      formatter: 'number',
      chart_type: 'line',
      line_width: 1,
      point_size: 1,
      fill: 0.5,
      stacked: STACKED_OPTIONS.NONE,
    },
    obj
  );
};
