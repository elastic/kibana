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
import type { TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';
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
    alwaysShowSign: false,
  });

  textConvert: TextContextTypeConvert = (val: string | number) => {
    if (this.param('fractional')) {
      return super.getConvertedValue(val);
    }

    // the value is expressed in percent units (35 means 35%): convert it to the
    // fraction the percent pattern expects before formatting, rather than trying
    // to divide the formatted string (which contains % and group separators)
    const numericVal = typeof val === 'string' ? parseFloat(val) : val;
    if (typeof numericVal !== 'number' || !Number.isFinite(numericVal)) {
      return super.getConvertedValue(val);
    }

    return super.getConvertedValue(numericVal / 100);
  };
}
