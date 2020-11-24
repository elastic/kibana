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

import {
  getUnitValue,
  parseInterval,
  convertIntervalToUnit,
  ASCENDING_UNIT_ORDER,
} from './unit_to_seconds';
import { getTimerange } from './get_timerange';
import { INTERVAL_STRING_RE, GTE_INTERVAL_RE } from '../../../../common/interval_regexp';
import { search } from '../../../../../data/server';

const calculateBucketData = (timeInterval, capabilities) => {
  let intervalString = capabilities
    ? capabilities.getValidTimeInterval(timeInterval)
    : timeInterval;
  const intervalStringMatch = intervalString.match(INTERVAL_STRING_RE);
  const parsedInterval = parseInterval(intervalString);

  let bucketSize = Number(intervalStringMatch[1]) * getUnitValue(intervalStringMatch[2]);

  // don't go too small
  if (bucketSize < 1) {
    bucketSize = 1;
  }

  // Check decimal
  if (parsedInterval && parsedInterval.value % 1 !== 0) {
    if (parsedInterval.unit !== 'ms') {
      const converted = convertIntervalToUnit(
        intervalString,
        ASCENDING_UNIT_ORDER[ASCENDING_UNIT_ORDER.indexOf(parsedInterval.unit) - 1]
      );

      if (converted) {
        intervalString = converted.value + converted.unit;
      }

      intervalString = undefined;
    } else {
      intervalString = '1ms';
    }
  }

  return {
    bucketSize,
    intervalString,
  };
};

const calculateBucketSizeForAutoInterval = (req, maxBars) => {
  const { from, to } = getTimerange(req);
  const timerange = to.valueOf() - from.valueOf();

  return search.aggs.calcAutoIntervalLessThan(maxBars, timerange).asSeconds();
};

export const getBucketSize = (req, interval, capabilities, maxBars) => {
  const bucketSize = calculateBucketSizeForAutoInterval(req, maxBars);
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
