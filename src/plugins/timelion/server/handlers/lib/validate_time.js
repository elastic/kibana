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

import { i18n } from '@kbn/i18n';
import moment from 'moment';

import toMS from '../../../common/lib/to_milliseconds.js';

export default function validateTime(time, tlConfig) {
  const span = moment.duration(moment(time.to).diff(moment(time.from))).asMilliseconds();
  const interval = toMS(time.interval);
  const bucketCount = span / interval;
  const maxBuckets = tlConfig.settings['timelion:max_buckets'];
  if (bucketCount > maxBuckets) {
    throw new Error(
      i18n.translate('timelion.serverSideErrors.bucketsOverflowErrorMessage', {
        defaultMessage:
          'Max buckets exceeded: {bucketCount} of {maxBuckets} allowed. ' +
          'Choose a larger interval or a shorter time span',
        values: {
          bucketCount: Math.round(bucketCount),
          maxBuckets,
        },
      })
    );
  }
  return true;
}
