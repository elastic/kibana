/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { NumeralFormat } from './numeral';
import { FIELD_FORMAT_IDS } from '../types';

export class NumberFormat extends NumeralFormat {
  static id = FIELD_FORMAT_IDS.NUMBER;
  static title = i18n.translate('data.fieldFormats.number.title', {
    defaultMessage: 'Number',
  });

  id = NumberFormat.id;
  title = NumberFormat.title;
  allowsNumericalAggregations = true;
}
