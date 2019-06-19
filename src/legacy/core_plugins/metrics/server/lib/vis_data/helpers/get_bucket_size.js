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

import { calculateAuto } from './calculate_auto';
import moment from 'moment';
import { getUnitValue } from './unit_to_seconds';
import { INTERVAL_STRING_RE, GTE_INTERVAL_RE } from '../../../../common/interval_regexp';

const calculateBucketData = (timeInterval, capabilities) => {
  const intervalString = capabilities
    ? capabilities.getValidTimeInterval(timeInterval)
    : timeInterval;
  const intervalStringMatch = intervalString.match(INTERVAL_STRING_RE);

  let bucketSize = Number(intervalStringMatch[1]) * getUnitValue(intervalStringMatch[2]);

  // don't go too small
  if (bucketSize < 1) {
    bucketSize = 1;
  }

  return {
    bucketSize,
    intervalString,
  };
};

const getTimeRangeBucketSize = ({ min, max }) => {
  const from = moment.utc(min);
  const to = moment.utc(max);
  const duration = moment.duration(to.valueOf() - from.valueOf(), 'ms');

  return calculateAuto.near(100, duration).asSeconds();
};

export const getBucketSize = (req, interval, capabilities) => {
  const bucketSize = getTimeRangeBucketSize(req.payload.timerange);
  let intervalString = `${bucketSize}s`;

  const gteAutoMatch = Boolean(interval) && interval.match(GTE_INTERVAL_RE);

  if (gteAutoMatch) {
    const bucketData = calculateBucketData(gteAutoMatch[1], capabilities);

    if (bucketData.bucketSize >= bucketSize) {
      return bucketData;
    }
  }

  const matches = interval && interval.match(INTERVAL_STRING_RE);

  if (matches) {
    intervalString = interval;
  }

  return calculateBucketData(intervalString, capabilities);
};
