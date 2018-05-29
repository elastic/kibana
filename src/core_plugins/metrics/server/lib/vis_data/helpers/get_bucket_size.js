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

import calculateAuto from './calculate_auto';
import moment from 'moment';
import unitToSeconds from './unit_to_seconds';
import {
  INTERVAL_STRING_RE,
  GTE_INTERVAL_RE
} from '../../../../common/interval_regexp';
export default (req, interval) => {
  const from = moment.utc(req.payload.timerange.min);
  const to = moment.utc(req.payload.timerange.max);
  const duration = moment.duration(to.valueOf() - from.valueOf(), 'ms');
  let bucketSize = calculateAuto.near(100, duration).asSeconds();
  if (bucketSize < 1) bucketSize = 1; // don't go too small
  let intervalString = `${bucketSize}s`;

  const gteAutoMatch = interval && interval.match(GTE_INTERVAL_RE);
  if (gteAutoMatch) {
    const intervalStringMatch = gteAutoMatch[1].match(INTERVAL_STRING_RE);
    const gteBucketSize = Number(intervalStringMatch[1]) * unitToSeconds(intervalStringMatch[2]);
    if (gteBucketSize >= bucketSize) {
      return {
        bucketSize: gteBucketSize,
        intervalString: gteAutoMatch[1]
      };
    }
  }

  const matches = interval && interval.match(INTERVAL_STRING_RE);
  if (matches) {
    bucketSize = Number(matches[1]) * unitToSeconds(matches[2]);
    intervalString = interval;
  }

  return { bucketSize, intervalString };
};
