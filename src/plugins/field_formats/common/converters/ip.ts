/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

/** @public */
export class IpFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.IP;
  static title = i18n.translate('fieldFormats.ip.title', {
    defaultMessage: 'IP address',
  });
  static fieldType = KBN_FIELD_TYPES.IP;

  textConvert: TextContextTypeConvert = (val: number) => {
    if (val === undefined || val === null) return '-';
    if (!isFinite(val)) return String(val);

    // shazzam!
    // eslint-disable-next-line no-bitwise
    return [val >>> 24, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff].join('.');
  };
}
