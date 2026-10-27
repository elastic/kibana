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
import type { TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
import { NumberFormat } from './number';

/** @public */
export class NumberRangeFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.NUMBER_RANGE;
  static title = i18n.translate('fieldFormats.numberRange.title', {
    defaultMessage: 'Number range',
  });
  static fieldType = KBN_FIELD_TYPES.NUMBER_RANGE;

  // ES|QL returns ranges (e.g. double_range) as "500.0..550.0", shown as "500-550".
  // Bounds use the default number format, which also caps float noise like 0.35000000000000003
  textConvert: TextContextTypeConvert = (val: unknown, options) => {
    const missing = this.checkForMissingValueText(val);
    if (missing) {
      return missing;
    }
    if (typeof val !== 'string') return JSON.stringify(val);

    const [from, to] = val.split('..');
    if (to === undefined) return val;

    const number = new NumberFormat({}, this.getConfig);
    return `${number.convertToText(Number(from), options)}-${number.convertToText(
      Number(to),
      options
    )}`;
  };
}
