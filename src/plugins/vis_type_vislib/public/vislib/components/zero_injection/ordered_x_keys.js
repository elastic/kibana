/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import moment from 'moment';
import { getUniqKeys } from './uniq_keys';

/*
 * Accepts a Kibana data object and returns
 * an array of x axis values.
 * values sorted by timestamp if isDate and Date Histogram agg
 * else values sorted by index
 */
export function orderXValues(obj, orderBucketsBySum = false) {
  if (!_.isObject(obj)) {
    throw new Error('orderXValues expects an object');
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
}
