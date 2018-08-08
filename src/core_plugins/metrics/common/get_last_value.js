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
export default (data, lookback = 1) => {
  if (_.isNumber(data)) return data;
  if (!Array.isArray(data)) return 0;
  // First try the last value
  const last = data[data.length - 1];
  const lastValue = Array.isArray(last) && last[1];
  if (lastValue) return lastValue;

  // If the last value is zero or null because of a partial bucket or
  // some kind of timeshift weirdness we will show the second to last.
  let lookbackCounter = 1;
  let value;
  while (lookback > lookbackCounter && !value) {
    const next = data[data.length - ++lookbackCounter];
    value =  _.isArray(next) && next[1] || 0;
  }
  return value || 0;
};


