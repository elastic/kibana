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
import moment, { unitOfTime } from 'moment';
import dateMath from '@elastic/datemath';

// Assume interval is in the form (value)(unit), such as "1h"
const INTERVAL_STRING_RE = new RegExp('^([0-9\\.]*)\\s*(' + dateMath.units.join('|') + ')$');

export function parseInterval(interval: string): moment.Duration | null {
  const matches = String(interval)
    .trim()
    .match(INTERVAL_STRING_RE);

  if (!matches) return null;

  try {
    const value = parseFloat(matches[1]) || 1;
    const unit = matches[2] as unitOfTime.Base;

    const duration = moment.duration(value, unit);

    // There is an error with moment, where if you have a fractional interval between 0 and 1, then when you add that
    // interval to an existing moment object, it will remain unchanged, which causes problems in the ordered_x_keys
    // code. To counteract this, we find the first unit that doesn't result in a value between 0 and 1.
    // For example, if you have '0.5d', then when calculating the x-axis series, we take the start date and begin
    // adding 0.5 days until we hit the end date. However, since there is a bug in moment, when you add 0.5 days to
    // the start date, you get the same exact date (instead of being ahead by 12 hours). So instead of returning
    // a duration corresponding to 0.5 hours, we return a duration corresponding to 12 hours.
    const selectedUnit = _.find(
      dateMath.units,
      u => Math.abs(duration.as(u)) >= 1
    ) as unitOfTime.Base;

    return moment.duration(duration.as(selectedUnit), selectedUnit);
  } catch (e) {
    return null;
  }
}
