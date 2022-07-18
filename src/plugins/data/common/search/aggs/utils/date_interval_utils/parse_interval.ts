/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { find } from 'lodash';
import moment from 'moment';
import dateMath, { Unit } from '@kbn/datemath';

// Assume interval is in the form (value)(unit), such as "1h"
const INTERVAL_STRING_RE = new RegExp('^([0-9\\.]*)\\s*(' + dateMath.units.join('|') + ')$');

export const splitStringInterval = (interval: string) => {
  if (interval) {
    const matches = interval.toString().trim().match(INTERVAL_STRING_RE);
    if (matches) {
      return {
        value: parseFloat(matches[1]) || 1,
        unit: matches[2] as Unit,
      };
    }
  }
  return null;
};

export function parseInterval(interval: string): moment.Duration | null {
  const parsedInterval = splitStringInterval(interval);

  if (!parsedInterval) return null;

  try {
    const { value, unit } = parsedInterval;
    const duration = moment.duration(value, unit);

    // There is an error with moment, where if you have a fractional interval between 0 and 1, then when you add that
    // interval to an existing moment object, it will remain unchanged, which causes problems in the ordered_x_keys
    // code. To counteract this, we find the first unit that doesn't result in a value between 0 and 1.
    // For example, if you have '0.5d', then when calculating the x-axis series, we take the start date and begin
    // adding 0.5 days until we hit the end date. However, since there is a bug in moment, when you add 0.5 days to
    // the start date, you get the same exact date (instead of being ahead by 12 hours). So instead of returning
    // a duration corresponding to 0.5 hours, we return a duration corresponding to 12 hours.
    const selectedUnit = find(dateMath.units, (u) => Math.abs(duration.as(u)) >= 1) as Unit;

    // however if we do this fhe other way around it will also fail
    // go from 500m to hours as this will result in infinite number (dividing 500/60 = 8.3*)
    // so we can only do this if we are changing to smaller units
    if (dateMath.units.indexOf(selectedUnit as any) < dateMath.units.indexOf(unit as any)) {
      return duration;
    }

    return moment.duration(duration.as(selectedUnit), selectedUnit);
  } catch (e) {
    return null;
  }
}
