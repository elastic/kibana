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
import _ from 'lodash';

/**
 * Analyse the given moment.js format pattern for the fractional sec part (S,SS,SSS...)
 * returning length, match, pattern and an escaped pattern, that excludes the fractional
 * part when formatting with moment.js -> e.g. [SSS]
 */
export function analysePatternForFract(pattern) {

  const fracSecMatch = pattern.match('S+'); //extract fractional seconds sub-pattern
  return {
    length: fracSecMatch[0] ? fracSecMatch[0].length : 0,
    patternNanos: fracSecMatch[0],
    pattern,
    patternEscaped: fracSecMatch[0] ? pattern.replace(fracSecMatch[0], `[${fracSecMatch[0]}]`) : '',
  };
}

/**
 * Format a given moment.js date object
 * Since momentjs would loose the exact value for fractional seconds with a higher resolution than
 * milliseconds, the fractional pattern is replaced by the fractional value of the raw timestamp
 */
export function formatWithNanos(dateMomentObj, valRaw, fracPatternObj) {

  if (fracPatternObj.length <= 3) {
    //S,SS,SSS is formatted correctly by moment.js
    return dateMomentObj.format(fracPatternObj.pattern);

  } else {
    //Beyond SSS the precise value of the raw datetime string is used
    const valFormatted = dateMomentObj.format(fracPatternObj.patternEscaped);
    //Extract fractional value of ES formatted timestamp, zero pad if necessary:
    //2020-05-18T20:45:05.957Z -> 957000000
    //2020-05-18T20:45:05.957000123Z -> 957000123
    //we do not need to take care of the year 10000 bug since max year of date_nanos is 2262
    const valNanos = valRaw
      .substr(20, valRaw.length - 21) //remove timezone(Z)
      .padEnd(9, '0') //pad shorter fractionals
      .substr(0, fracPatternObj.patternNanos.length);
    return valFormatted.replace(fracPatternObj.patternNanos, valNanos);
  }
}

export function createDateNanosFormat(FieldFormat) {
  return class DateNanosFormat extends FieldFormat {
    constructor(params, getConfig) {
      super(params);

      this.getConfig = getConfig;
    }

    getParamDefaults() {
      return {
        pattern: this.getConfig('dateNanosFormat'),
        timezone: this.getConfig('dateFormat:tz'),
      };
    }

    _convert(val) {
      // don't give away our ref to converter so
      // we can hot-swap when config changes
      const pattern = this.param('pattern');
      const timezone = this.param('timezone');
      const fractPattern = analysePatternForFract(pattern);

      const timezoneChanged = this._timeZone !== timezone;
      const datePatternChanged = this._memoizedPattern !== pattern;
      if (timezoneChanged || datePatternChanged) {
        this._timeZone = timezone;
        this._memoizedPattern = pattern;

        this._memoizedConverter = _.memoize(function converter(val) {
          if (val === null || val === undefined) {
            return '-';
          }

          const date = moment(val);

          if (date.isValid()) {
            return formatWithNanos(date, val, fractPattern);
          } else {
            return val;
          }
        });
      }

      return this._memoizedConverter(val);
    }

    static id = 'date_nanos';
    static title = 'Date Nanos';
    static fieldType = 'date';
  };
}
