/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isDate, isString, mapValues } from 'lodash';
import moment from 'moment-timezone';
import { RRule as OrigRRule, Options } from 'rrule';

// rrule.js has a bizarre handling of timezone offsets in date strings. It completely ignores any timezone information expressed
// in a Javascript Date object, and just applies its specified TZID to whatever date string it receives. But it doesn't calculate
// this in absolute unix time or anything, it just reads the date string from the Date object. So basically we can work with
// - System local time (variable, unstable, unpredictable), or
// - UTC (always the same)
// Except GET THIS!!! You can EXPRESS A TIME IN UTC like "2023-03-07T22:00:00Z" and then rrule.js is like, "Oh, ok, March 7 at 10pm"
// even if the computer doing all the computering is in Japan, where it's already March 8th at 10pm UTC, but NOPE NOBODY CARES, TOO
// BAD FOR YOU, GEE WILLICKERS TIME ZONES SURE ARE HARD, GOOD LUCK END USER, so basically that's why we have a function that
// takes a date and time and then just plops a Z at the end of it so that we don't break everything.
function UTCSpoofedDate(dt: string, tzid: string) {
  return new Date(moment(dt).tz(tzid).format('YYYY-MM-DDTHH:mm:ss') + 'Z');
}

const keysToUTCSpoof = ['dtstart', 'until'];

export class RRule extends OrigRRule {
  constructor(options: Partial<Options>) {
    const tzid = options.tzid ?? 'UTC';

    const tzCorrectedOptions = mapValues(options, (val, key) => {
      if (keysToUTCSpoof.includes(key) && (isDate(val) || isString(val))) {
        const dt = isDate(val) ? val.toISOString() : val;
        return UTCSpoofedDate(dt, tzid);
      }
      return val;
    }) as Options;
    super(tzCorrectedOptions);
  }
}
