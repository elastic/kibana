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

import { orderXValues } from './ordered_x_keys';
import { createZeroFilledArray } from './zero_filled_array';
import { zeroFillDataArray } from './zero_fill_data_array';

/*
* A Kibana data object may have multiple series with different array lengths.
* This proves an impediment to stacking in the visualization library.
* Therefore, zero values must be injected wherever these arrays do not line up.
* That is, each array must have the same x values with zeros filled in where the
* x values were added.
*
* This function and its helper functions accepts a Kibana data object
* and injects zeros where needed.
*/

export function injectZeros(obj, data, orderBucketsBySum = false) {
  const keys = orderXValues(data, orderBucketsBySum);

  obj.forEach(function (series) {
    const zeroArray = createZeroFilledArray(keys, series.label);
    series.values = zeroFillDataArray(zeroArray, series.values);
  });

  return obj;
}
