/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

/** @public */
export class RelativeDateFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.RELATIVE_DATE;
  static title = i18n.translate('fieldFormats.relative_date.title', {
    defaultMessage: 'Relative date',
  });
  static fieldType = KBN_FIELD_TYPES.DATE;

  textConvert: TextContextTypeConvert = (val: string | number) => {
    if (val === null || val === undefined) {
      return '-';
    }

    const date = moment(val);
    if (date.isValid()) {
      return date.fromNow();
    } else {
      return String(val);
    }
  };
}
