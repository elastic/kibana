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
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';

/** @public */
export class PercentFormat extends NumeralFormat {
  static id = FIELD_FORMAT_IDS.PERCENT;
  static title = i18n.translate('fieldFormats.percent.title', {
    defaultMessage: 'Percentage',
  });

  id = PercentFormat.id;
  title = PercentFormat.title;
  allowsNumericalAggregations = true;

  getParamDefaults = () => ({
    pattern: this.getConfig!(FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN),
    fractional: true,
  });

  textConvert: TextContextTypeConvert = (val: string | number) => {
    const formatted = super.getConvertedValue(val);

    if (this.param('fractional')) {
      return formatted;
    }

    return String(Number(formatted) / 100);
  };
}
