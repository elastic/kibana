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

import { uniq } from 'lodash';
import moment from 'moment';

export function initXAxis(chart, table) {
  const { format, title, params, accessor } = chart.aspects.x[0];

  chart.xAxisOrderedValues =
    accessor === -1 ? [params.defaultValue] : uniq(table.rows.map(r => r[accessor]));
  chart.xAxisFormat = format;
  chart.xAxisLabel = title;

  if (params.interval) {
    chart.ordered = {
      interval: params.date ? moment.duration(params.interval) : params.interval,
    };
  }
}
