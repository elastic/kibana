/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { NumeralFormat } from './numeral';
import { FIELD_FORMAT_IDS } from '../types';

/** @public */
export class CurrencyFormat extends NumeralFormat {
  static id = FIELD_FORMAT_IDS.CURRENCY;
  static title = i18n.translate('fieldFormats.currency.title', {
    defaultMessage: 'Currency',
  });

  id = CurrencyFormat.id;
  title = CurrencyFormat.title;
  allowsNumericalAggregations = true;
}
