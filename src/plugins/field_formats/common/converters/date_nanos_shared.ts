/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { memoize, noop } from 'lodash';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import moment, { Moment } from 'moment';
import { FieldFormat, FIELD_FORMAT_IDS } from '..';
import { TextContextTypeConvert } from '../types';

interface FractPatternObject {
  length: number;
  patternNanos: string;
  pattern: string;
  patternEscaped: string;
}

/**
 * Analyse the given moment.js format pattern for the fractional sec part (S,SS,SSS...)
 * returning length, match, pattern and an escaped pattern, that excludes the fractional
 * part when formatting with moment.js -> e.g. [SSS]
 */
export function analysePatternForFract(pattern: string): FractPatternObject {
  const fracSecMatch = pattern.match('S+'); // extract fractional seconds sub-pattern
  const fracSecMatchStr = fracSecMatch ? fracSecMatch[0] : '';

  return {
    length: fracSecMatchStr.length,
    patternNanos: fracSecMatchStr,
    pattern,
    patternEscaped: fracSecMatchStr ? pattern.replace(fracSecMatchStr, `[${fracSecMatchStr}]`) : '',
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
  fracPatternObj: FractPatternObject
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
  static title = i18n.translate('fieldFormats.date_nanos.title', {
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

  textConvert: TextContextTypeConvert = (val: string | number) => {
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

      this.memoizedConverter = memoize(function converter(value: string | number) {
        if (value === null || value === undefined) {
          return '-';
        }

        const date = moment(value);

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
