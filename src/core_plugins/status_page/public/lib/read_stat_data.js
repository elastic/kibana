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

import _ from 'lodash';

export default function readStatData(data, seriesNames) {
  // Metric Values format
  // metric: [[xValue, yValue], ...]
  // LoadMetric:
  // metric: [[xValue, [yValue, yValue2, yValue3]], ...]
  // return [
  //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue}, ...]},
  //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue1}, ...]},
  //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue2}, ...]}]
  //
  // Go through all of the metric values and split the values out.
  // returns an array of all of the averages

  const metricList = [];
  seriesNames = seriesNames || [];
  data.forEach(function (vector) {
    vector = _.flatten(vector);
    const x = vector.shift();
    vector.forEach(function (yValue, i) {
      const series = seriesNames[i] || '';

      if (!metricList[i]) {
        metricList[i] = {
          key: series,
          values: []
        };
      }
      // unshift to make sure they're in the correct order
      metricList[i].values.unshift({
        x: x,
        y: yValue
      });
    });
  });

  return metricList;
}
