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

import dateMath from '@elastic/datemath';
import { TimeBuckets } from './time_buckets';
import { TimeRange } from '../../../../../../../../plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getUiSettings } from '../../../../../../../../plugins/data/public/services';

export function toAbsoluteDates(range?: TimeRange) {
  if (!range) {
    return;
  }

  const fromDate = dateMath.parse(range.from);
  const toDate = dateMath.parse(range.to, { roundUp: true });

  if (!fromDate || !toDate) {
    return;
  }

  return {
    from: fromDate.toDate(),
    to: toDate.toDate(),
  };
}

export function calculateAutoTimeExpression(range?: TimeRange, defaultValue: string = '1h') {
  const dates = toAbsoluteDates(range);
  if (!dates) {
    return defaultValue;
  }

  const buckets = new TimeBuckets({ uiSettings: getUiSettings() });

  buckets.setInterval('auto');
  buckets.setBounds({
    min: dates.from,
    max: dates.to,
  });

  return buckets.getInterval().expression;
}
