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
import moment from 'moment-timezone';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat, IFieldFormatMetaParams } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

export class DateFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DATE;
  static title = i18n.translate('data.common.fieldFormats.date.title', {
    defaultMessage: 'Date',
  });
  static fieldType = KBN_FIELD_TYPES.DATE;

  private memoizedConverter: Function = noop;
  private memoizedPattern: string = '';
  private timeZone: string = '';

  constructor(params: IFieldFormatMetaParams, getConfig: Function) {
    super(params, getConfig);

    this.memoizedConverter = memoize((val: any) => {
      if (val == null) {
        return '-';
      }

      /* On the server, importing moment returns a new instance. Unlike on
       * the client side, it doesn't have the dateFormat:tz configuration
       * baked in.
       * We need to set the timezone manually here. The date is taken in as
       * UTC and converted into the desired timezone. */
      let date;
      if (this.timeZone === 'Browser') {
        // Assume a warning has been logged this can be unpredictable. It
        // would be too verbose to log anything here.
        date = moment.utc(val);
      } else {
        date = moment.utc(val).tz(this.timeZone);
      }

      if (date.isValid()) {
        return date.format(this.memoizedPattern);
      } else {
        return val;
      }
    });
  }

  getParamDefaults() {
    return {
      pattern: this.getConfig!('dateFormat'),
      timezone: this.getConfig!('dateFormat:tz'),
    };
  }

  textConvert: TextContextTypeConvert = val => {
    // don't give away our ref to converter so we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = this.param('timezone');

    const timezoneChanged = this.timeZone !== timezone;
    const datePatternChanged = this.memoizedPattern !== pattern;
    if (timezoneChanged || datePatternChanged) {
      this.timeZone = timezone;
      this.memoizedPattern = pattern;
    }

    return this.memoizedConverter(val);
  };
}
