/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { memoize, noop } from 'lodash';
import moment from 'moment-timezone';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat, FIELD_FORMAT_IDS, FieldFormatsGetConfigFn } from '../../../common';
import {
  FieldFormatMetaParams,
  FieldFormatParams,
  TextContextTypeConvert,
} from '../../../common/types';

export class DateFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DATE;
  static title = i18n.translate('fieldFormats.date.title', {
    defaultMessage: 'Date',
  });
  static fieldType = KBN_FIELD_TYPES.DATE;

  private memoizedConverter: Function = noop;
  private memoizedPattern: string = '';
  private timeZone: string = '';

  constructor(
    params?: FieldFormatParams & FieldFormatMetaParams,
    getConfig?: FieldFormatsGetConfigFn
  ) {
    super(params, getConfig);

    this.memoizedConverter = memoize((val: string | number) => {
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

  textConvert: TextContextTypeConvert = (val: string | number, options) => {
    // don't give away our ref to converter so we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = options?.timezone || this.param('timezone');

    const timezoneChanged = this.timeZone !== timezone;
    const datePatternChanged = this.memoizedPattern !== pattern;
    if (timezoneChanged || datePatternChanged) {
      this.timeZone = timezone;
      this.memoizedPattern = pattern;
    }

    return this.memoizedConverter(val);
  };
}
