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

import { isObject, isNumber } from 'lodash';
import { flattenData } from './flatten_data';

/*
  * Accepts a Kibana data object.
  * Returns an object with unique x axis values as keys with an object of
  * their index numbers and an isNumber boolean as their values.
  * e.g. { 'xAxisValue': { index: 1, isNumber: false }}, ...
  */
export function getUniqKeys(obj) {
  if (!isObject(obj)) {
    throw new TypeError('getUniqKeys expects an object');
  }

  const flattenedData = flattenData(obj);
  const uniqueXValues = new Map();

  let charts;
  if (!obj.series) {
    charts = obj.rows ? obj.rows : obj.columns;
  } else {
    charts = [obj];
  }

  const isDate = charts.every(chart => {
    return chart.ordered && chart.ordered.date;
  });

  const isOrdered = charts.every(chart => {
    return chart.ordered;
  });

  const initXValue = (key, index) => {
    uniqueXValues.set(key, {
      index,
      isDate,
      isOrdered,
      isNumber: isNumber(key),
      sum: 0,
    });
  };

  // Populate `uniqueXValues` with the preserved x key order from the
  // original tabified data. `flattenedData` only contains the first
  // non-zero values in each series, and therefore is not guaranteed
  // to match the order that came back from ES.
  if (obj.xAxisOrderedValues) {
    obj.xAxisOrderedValues.forEach(initXValue);
  }

  // Generate a sum for each value
  flattenedData.forEach(d => {
    const key = d.x;
    let prev = uniqueXValues.get(key);
    if (!prev) {
      // Value doesn't exist in xAxisOrderedValues, so we create it
      // and index it at the end.
      initXValue(key, uniqueXValues.size);
      prev = uniqueXValues.get(key);
    }
    uniqueXValues.set(key, {
      ...prev,
      sum: prev.sum + d.y,
    });
  });

  return uniqueXValues;
}
