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

import { memoize } from 'lodash';
import moment from 'moment-timezone';
import {
  analysePatternForFract,
  DateNanosFormat,
  formatWithNanos,
} from '../../../common/field_formats/converters/date_nanos_shared';
import { TextContextTypeConvert } from '../../../common';

class DateNanosFormatServer extends DateNanosFormat {
  textConvert: TextContextTypeConvert = (val) => {
    // don't give away our ref to converter so
    // we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = this.param('timezone');
    const fractPattern = analysePatternForFract(pattern);
    const fallbackPattern = this.param('patternFallback');

    const timezoneChanged = this.timeZone !== timezone;
    const datePatternChanged = this.memoizedPattern !== pattern;
    if (timezoneChanged || datePatternChanged) {
      this.timeZone = timezone;
      this.memoizedPattern = pattern;

      this.memoizedConverter = memoize((value: any) => {
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
          date = moment.utc(val);
        } else {
          date = moment.utc(val).tz(this.timeZone);
        }

        if (typeof value !== 'string' && date.isValid()) {
          // fallback for max/min aggregation, where unixtime in ms is returned as a number
          // aggregations in Elasticsearch generally just return ms
          return date.format(fallbackPattern);
        } else if (date.isValid()) {
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
