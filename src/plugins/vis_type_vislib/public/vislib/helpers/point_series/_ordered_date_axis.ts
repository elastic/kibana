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

import { OrderedChart } from './point_series';

export function orderedDateAxis(chart: OrderedChart) {
  const x = chart.aspects.x[0];
  const bounds = 'bounds' in x.params ? x.params.bounds : undefined;

  chart.ordered.date = true;

  if (bounds) {
    chart.ordered.min = typeof bounds.min === 'string' ? Date.parse(bounds.min) : bounds.min;
    chart.ordered.max = typeof bounds.max === 'string' ? Date.parse(bounds.max) : bounds.max;
  } else {
    chart.ordered.endzones = false;
  }
}
