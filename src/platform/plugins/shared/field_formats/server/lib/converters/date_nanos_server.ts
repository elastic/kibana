/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoize } from 'lodash';
import moment from 'moment-timezone';
import {
  analysePatternForFract,
  DateNanosFormat,
  formatWithNanos,
} from '../../../common/converters/date_nanos_shared';
import { TextContextTypeConvert } from '../../../common/types';

class DateNanosFormatServer extends DateNanosFormat {
  textConvert: TextContextTypeConvert = (val: string | number, options) => {
    // don't give away our ref to converter so
    // we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = options?.timezone || this.param('timezone');
    const fractPattern = analysePatternForFract(pattern);
    const fallbackPattern = this.param('patternFallback');

    const timezoneChanged = this.timeZone !== timezone;
    const datePatternChanged = this.memoizedPattern !== pattern;
    if (timezoneChanged || datePatternChanged) {
      this.timeZone = timezone;
      this.memoizedPattern = pattern;

      this.memoizedConverter = memoize((value: string | number) => {
        if (value === null || value === undefined) {
          return '-';
        }

        /* On the server, importing moment returns a new instance. Unlike on
         * the client side, it doesn't have the dateFormat:tz configuration
         * baked in.
         * We need to set the timezone manually here. The date is taken in as
         * UTC and converted into the desired timezone. */
        let date;
        if (this.timeZone === 'Browser') {
          // Assume a warning has been logged that this can be unpredictable. It
          // would be too verbose to log anything here.
          date = moment.utc(value);
        } else {
          date = moment.utc(value).tz(this.timeZone);
        }

        if (typeof value !== 'string' && date.isValid()) {
          // fallback for max/min aggregation, where unixtime in ms is returned as a number
          // aggregations in Elasticsearch generally just return ms
          return date.format(fallbackPattern);
        } else if (date.isValid() && typeof value === 'string') {
          return formatWithNanos(date, value, fractPattern);
        } else {
          return value;
        }
      });
    }

    return this.memoizedConverter(val);
  };
}

export { DateNanosFormatServer as DateNanosFormat };
