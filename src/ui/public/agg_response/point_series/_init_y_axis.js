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

export function initYAxis(chart) {
  const y = chart.aspects.y;

  if (Array.isArray(y)) {
    // TODO: vis option should allow choosing this format
    chart.yAxisFormatter = y[0].aggConfig.fieldFormatter();
    chart.yAxisLabel = ''; // use the legend
  } else {
    chart.yAxisFormatter = y.aggConfig.fieldFormatter();
    chart.yAxisLabel = y.title;
  }

  const z = chart.aspects.series;
  if (z) {
    if (Array.isArray(z)) {
      chart.zAxisFormatter = z[0].aggConfig.fieldFormatter();
      chart.zAxisLabel = ''; // use the legend
    } else {
      chart.zAxisFormatter = z.aggConfig.fieldFormatter();
      chart.zAxisLabel = z.title;
    }
  }
}
