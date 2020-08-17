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
import moment from 'moment';
import { UI_SETTINGS } from '../../../../common/constants';
import { TimeRange } from '../../../../common/query';
import { TimeBuckets } from '../buckets/lib/time_buckets';
import { toAbsoluteDates } from './date_interval_utils';

export function getCalculateAutoTimeExpression(getConfig: (key: string) => any) {
  return function calculateAutoTimeExpression(range: TimeRange) {
    const dates = toAbsoluteDates(range);
    if (!dates) {
      return;
    }

    const buckets = new TimeBuckets({
      'histogram:maxBars': getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': getConfig(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: getConfig('dateFormat'),
      'dateFormat:scaled': getConfig('dateFormat:scaled'),
    });

    buckets.setInterval('auto');
    buckets.setBounds({
      min: moment(dates.from),
      max: moment(dates.to),
    });

    return buckets.getInterval().expression;
  };
}
