/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { truncate } from 'lodash';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

const omission = '...';

/** @public */
export class TruncateFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.TRUNCATE;
  static title = i18n.translate('fieldFormats.truncated_string.title', {
    defaultMessage: 'Truncated string',
  });
  static fieldType = KBN_FIELD_TYPES.STRING;

  textConvert: TextContextTypeConvert = (val: string) => {
    const length = this.param('fieldLength');
    if (length > 0) {
      return truncate(val, {
        length: length + omission.length,
        omission,
      });
    }

    return val;
  };
}
