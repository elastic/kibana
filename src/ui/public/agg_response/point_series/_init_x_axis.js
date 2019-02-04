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

export function initXAxis(chart, table) {
  const { format, title, params, accessor } = chart.aspects.x[0];
  chart.xAxisFormat = format;
  chart.xAxisLabel = title;
  if (params.interval) {
    let interval = params.interval;
    // compute the interval from data only for histogram
    if (table.rows.length > 1 && !params.date) {
      // the max interval is enforced on courier pre-flight request
      interval = Math.abs(table.rows[1][accessor] - table.rows[0][accessor]);
    }
    chart.ordered = {
      interval,
    };
  }
}
