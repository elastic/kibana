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

export function initXAxis(chart, table) {
  const x = chart.aspects.x;
  chart.xAxisFormatter = x.aggConfig ? x.aggConfig.fieldFormatter() : String;
  chart.xAxisLabel = x.title;
  chart.xAxisOrderedValues = x.i === -1
    ? [x.params.defaultValue]
    : uniq(table.rows.map(r => r[x.i].value));

  if (!x.aggConfig || !x.aggConfig.type.ordered) return;

  chart.indexPattern = x.aggConfig.getIndexPattern();
  chart.xAxisField = x.aggConfig.params.field;

  chart.ordered = {};
  const xAggOutput = x.aggConfig.write();
  if (xAggOutput.params.interval && xAggOutput.params.interval !== '0ms') {
    chart.ordered.interval = xAggOutput.params.interval;
  }
}
