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

/*
 * Accepts an array of zero-filled y value objects (arr1)
 * and a kibana data.series[i].values array of objects (arr2).
 * Return a zero-filled array of objects (arr1).
 */

export function zeroFillDataArray(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
    throw new TypeError('zeroFillDataArray expects 2 arrays');
  }

  let i;
  let val;
  let index;
  const max = arr2.length;

  const getX = function(d) {
    return d.x === val.x;
  };

  for (i = 0; i < max; i++) {
    val = arr2[i];
    index = _.findIndex(arr1, getX);
    arr1.splice(index, 1, val);
  }

  return arr1;
}
