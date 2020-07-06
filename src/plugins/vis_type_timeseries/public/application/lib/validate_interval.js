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

import { GTE_INTERVAL_RE } from '../../../../../plugins/vis_type_timeseries/common/interval_regexp';
import { i18n } from '@kbn/i18n';
import { search } from '../../../../../plugins/data/public';
const { parseInterval } = search.aggs;

export function validateInterval(bounds, panel, maxBuckets) {
  const { interval } = panel;
  const { min, max } = bounds;
  // No need to check auto it will return around 100
  if (!interval) return;
  if (interval === 'auto') return;
  const greaterThanMatch = interval.match(GTE_INTERVAL_RE);
  if (greaterThanMatch) return;
  const duration = parseInterval(interval);
  if (duration) {
    const span = max.valueOf() - min.valueOf();
    const buckets = Math.floor(span / duration.asMilliseconds());
    if (buckets > maxBuckets) {
      throw new Error(
        i18n.translate(
          'visTypeTimeseries.validateInterval.notifier.maxBucketsExceededErrorMessage',
          {
            defaultMessage:
              'Your query attempted to fetch too much data. Reducing the time range or changing the interval used usually fixes the issue.',
          }
        )
      );
    }
  }
}
