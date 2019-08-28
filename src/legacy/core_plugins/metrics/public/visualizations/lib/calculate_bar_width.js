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
// bar sizes are measured in milliseconds so this assumes that the different
// between timestamps is in milliseconds. A normal bar size is 70% which gives
// enough spacing for the bar.
export const calculateBarWidth = (series, multiplier = 0.7) => {
  const first = _.first(series);
  try {
    return (first.data[1][0] - first.data[0][0]) * multiplier;
  } catch (e) {
    return 1000; // 1000 ms
  }
};
