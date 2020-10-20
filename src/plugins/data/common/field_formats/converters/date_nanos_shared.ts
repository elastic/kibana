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

import { i18n } from '@kbn/i18n';
import { memoize, noop } from 'lodash';
import moment, { Moment } from 'moment';
import { FieldFormat, FIELD_FORMAT_IDS, KBN_FIELD_TYPES } from '../../';
import { TextContextTypeConvert } from '../types';

/**
 * Analyse the given moment.js format pattern for the fractional sec part (S,SS,SSS...)
 * returning length, match, pattern and an escaped pattern, that excludes the fractional
 * part when formatting with moment.js -> e.g. [SSS]
 */
export function analysePatternForFract(pattern: string) {
  const fracSecMatch = pattern.match('S+') as any; // extract fractional seconds sub-pattern
  const fracSecMatchStr = fracSecMatch ? fracSecMatch[0] : '';

  return {
    length: fracSecMatchStr.length,
    patternNanos: fracSecMatchStr,
    pattern,
    patternEscaped: fracSecMatchStr ? pattern.replace(fracSecMatch, `[${fracSecMatch}]`) : '',
  };
}

/**
 * Format a given moment.js date object
 * Since momentjs would loose the exact value for fractional seconds with a higher resolution than
 * milliseconds, the fractional pattern is replaced by the fractional value of the raw timestamp
 */
export function formatWithNanos(
  dateMomentObj: Moment,
  valRaw: string,
  fracPatternObj: Record<string, any>
) {
  if (fracPatternObj.length <= 3) {
    // S,SS,SSS is formatted correctly by moment.js
    return dateMomentObj.format(fracPatternObj.pattern);
  } else {
    // Beyond SSS the precise value of the raw datetime string is used
    const valFormatted = dateMomentObj.format(fracPatternObj.patternEscaped);
    // Extract fractional value of ES formatted timestamp, zero pad if necessary:
    // 2020-05-18T20:45:05.957Z -> 957000000
    // 2020-05-18T20:45:05.957000123Z -> 957000123
    // we do not need to take care of the year 10000 bug since max year of date_nanos is 2262
    const valNanos = valRaw
      .substr(20, valRaw.length - 21) // remove timezone(Z)
      .padEnd(9, '0') // pad shorter fractionals
      .substr(0, fracPatternObj.patternNanos.length);
    return valFormatted.replace(fracPatternObj.patternNanos, valNanos);
  }
}

export class DateNanosFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DATE_NANOS;
  static title = i18n.translate('data.fieldFormats.date_nanos.title', {
    defaultMessage: 'Date nanos',
  });
  static fieldType = KBN_FIELD_TYPES.DATE;

  protected memoizedConverter: Function = noop;
  protected memoizedPattern: string = '';
  protected timeZone: string = '';

  getParamDefaults() {
    return {
      pattern: this.getConfig!('dateNanosFormat'),
      fallbackPattern: this.getConfig!('dateFormat'),
      timezone: this.getConfig!('dateFormat:tz'),
    };
  }

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

      this.memoizedConverter = memoize(function converter(value: any) {
        if (value === null || value === undefined) {
          return '-';
        }

        const date = moment(value);

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
