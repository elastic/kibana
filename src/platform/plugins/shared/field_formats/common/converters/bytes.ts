/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { NumeralFormat } from './numeral';
import { FIELD_FORMAT_IDS } from '../types';

/** @public */
export class BytesFormat extends NumeralFormat {
  static id = FIELD_FORMAT_IDS.BYTES;
  static title = i18n.translate('fieldFormats.bytes.title', {
    defaultMessage: 'Bytes',
  });

  id = BytesFormat.id;
  title = BytesFormat.title;
  allowsNumericalAggregations = true;
}
