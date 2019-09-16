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
import {
  getUnitValue,
  parseInterval,
  convertIntervalToUnit,
  ASCENDING_UNIT_ORDER,
} from './unit_to_seconds';
import { getTimerangeDuration } from '../helpers/get_timerange';
import { INTERVAL_STRING_RE, GTE_INTERVAL_RE } from '../../../../common/interval_regexp';

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
  if (parsedInterval.value % 1 !== 0) {
    if (parsedInterval.unit !== 'ms') {
      const { value, unit } = convertIntervalToUnit(
        intervalString,
        ASCENDING_UNIT_ORDER[ASCENDING_UNIT_ORDER.indexOf(parsedInterval.unit) - 1]
      );

      intervalString = value + unit;
    } else {
      intervalString = '1ms';
    }
  }

  return {
    bucketSize,
    intervalString,
  };
};

const calculateBucketSizeForAutoInterval = req => {
  const duration = getTimerangeDuration(req);

  return calculateAuto.near(100, duration).asSeconds();
};

export const getBucketSize = (req, interval, capabilities) => {
  const bucketSize = calculateBucketSizeForAutoInterval(req);
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
