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

import { memoize, noop } from 'lodash';
import moment from 'moment';
import {
  FieldFormat,
  KBN_FIELD_TYPES,
  TextContextTypeConvert,
  FIELD_FORMAT_IDS,
} from '../../../common';

export class DateFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DATE;
  static title = 'Date';
  static fieldType = KBN_FIELD_TYPES.DATE;

  private memoizedConverter: Function = noop;
  private memoizedPattern: string = '';
  private timeZone: string = '';

  getParamDefaults() {
    return {
      pattern: this.getConfig!('dateFormat'),
      timezone: this.getConfig!('dateFormat:tz'),
    };
  }

  textConvert: TextContextTypeConvert = val => {
    // don't give away our ref to converter so
    // we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = this.param('timezone');

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

        if (date.isValid()) {
          return date.format(pattern);
        } else {
          return value;
        }
      });
    }

    return this.memoizedConverter(val);
  };
}
