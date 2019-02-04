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

import { startsWith } from 'lodash';
const percentileTest = /\[[0-9\.]+\]$/;
const percentileNumberTest = /\d+\.\d+/;
export default (id, metrics) => {
  const metric = metrics.find(m => startsWith(id, m.id));
  let bucketsPath = String(id);

  switch (metric.type) {
    case 'derivative':
      bucketsPath += '[normalized_value]';
      break;
    // For percentiles we need to breakout the percentile key that the user
    // specified. This information is stored in the key using the following pattern
    // {metric.id}[{percentile}]
    case 'percentile':
      if (percentileTest.test(bucketsPath)) break;
      const percent = metric.percentiles[0];
      const percentileKey = percentileNumberTest.test(`${percent.value}`) ? `${percent.value}` : `${percent.value}.0`;
      bucketsPath += `[${percentileKey}]`;
      break;
    case 'percentile_rank':
      bucketsPath += `[${metric.value}]`;
      break;
    case 'std_deviation':
    case 'variance':
    case 'sum_of_squares':
      if (/^std_deviation/.test(metric.type) && ~['upper', 'lower'].indexOf(metric.mode)) {
        bucketsPath += `[std_${metric.mode}]`;
      } else {
        bucketsPath += `[${metric.type}]`;
      }
      break;
  }


  return bucketsPath;
};

