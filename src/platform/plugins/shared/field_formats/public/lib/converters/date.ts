/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { memoize, noop } from 'lodash';
import moment from 'moment';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat, FIELD_FORMAT_IDS } from '../../../common';
import { TextContextTypeConvert } from '../../../common/types';

export class DateFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.DATE;
  static title = i18n.translate('fieldFormats.date.title', {
    defaultMessage: 'Date',
  });
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

  textConvert: TextContextTypeConvert = (val: string | number) => {
    // don't give away our ref to converter so
    // we can hot-swap when config changes
    const pattern = this.param('pattern');
    const timezone = this.param('timezone');

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

        if (date.isValid()) {
          return date.locale(i18n.getLocale()).format(pattern);
        } else {
          return value;
        }
      });
    }

    return this.memoizedConverter(val);
  };
}
