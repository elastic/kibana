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
    match: fracSecMatch[0],
    pattern,
    patternEscaped: fracSecMatch[0] ? pattern.replace(fracSecMatch[0], `[${fracSecMatch[0]}]`) : '',
  };
}

/**
 * Format a given moment.js date object, for patterns with more then 3 fractional seconds (S)
 * the raw data information given by the textual timestamp is replaced, since moment.js
 * doesn't cover Fractional seconds formatting
 */
export function formatWithNanos(dateMomentObj, valRaw, fracPatternObj) {

  if (fracPatternObj.length <= 3) {
    //S,SS,SSS is formatted correctly by moment.js
    return dateMomentObj.format(fracPatternObj.pattern);

  } else {
    //Beyond SSS the precise value of the raw datetime string is used
    const valFormatted = dateMomentObj.format(fracPatternObj.patternEscaped);
    const precise = valRaw.substr(20, fracPatternObj.length);
    return valFormatted.replace(fracPatternObj.match, precise);
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
