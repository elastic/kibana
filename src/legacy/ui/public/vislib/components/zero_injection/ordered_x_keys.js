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
import moment from 'moment';
import { VislibComponentsZeroInjectionUniqKeysProvider } from './uniq_keys';

export function VislibComponentsZeroInjectionOrderedXKeysProvider(Private) {
  const getUniqKeys = Private(VislibComponentsZeroInjectionUniqKeysProvider);

  /*
   * Accepts a Kibana data object and returns
   * an array of x axis values.
   * values sorted by timestamp if isDate and Date Histogram agg
   * else values sorted by index
   */

  return function (obj, orderBucketsBySum = false) {
    if (!_.isObject(obj)) {
      throw new Error('OrderedXKeysUtilService expects an object');
    }

    const uniqKeys = getUniqKeys(obj);
    const uniqKeysPairs = [...uniqKeys.entries()];

    const interval = _.get(obj, 'ordered.interval');
    const dateInterval = moment.isDuration(interval) ? interval : false;

    return _(uniqKeysPairs)
      .sortBy(function (d) {
        if (d[1].isDate || d[1].isOrdered) {
          return +d[0];
        }
        return orderBucketsBySum ? -d[1].sum : d[1].index;
      })
      .map(function (d, i, list) {
        if (!d[1].isNumber) return d[0];

        const val = +d[0];
        if (interval == null) return val;

        const gapEdge = parseFloat(_.get(list, [i + 1, 0]));
        if (isNaN(gapEdge)) return val;

        const vals = [];
        let next = val;

        if (dateInterval) {
          next = moment(val);
          while (next < gapEdge) {
            vals.push(next.valueOf());
            next.add(dateInterval);
          }
        } else {
          while (next < gapEdge) {
            vals.push(next);
            next += interval;
          }
        }

        return vals;
      })
      .flatten()
      .value();
  };
}
