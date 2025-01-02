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
import { BytesFormat } from './bytes';
import { NumberFormat } from './number';
import { PercentFormat } from './percent';

/** @public */
export class HistogramFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.HISTOGRAM;
  static fieldType = KBN_FIELD_TYPES.HISTOGRAM;
  static title = i18n.translate('fieldFormats.histogram.title', {
    defaultMessage: 'Histogram',
  });

  id = HistogramFormat.id;
  title = HistogramFormat.title;
  allowsNumericalAggregations = true;

  // Nested internal formatter
  getParamDefaults() {
    return {
      id: 'number',
      params: {},
    };
  }

  textConvert: TextContextTypeConvert = (val: number, options) => {
    if (typeof val === 'number') {
      const subFormatId = this.param('id');
      const SubFormat =
        subFormatId === 'bytes'
          ? BytesFormat
          : subFormatId === 'percent'
          ? PercentFormat
          : NumberFormat;
      const converter = new SubFormat(this.param('params'), this.getConfig);
      return converter.textConvert(val, options);
    } else {
      return JSON.stringify(val);
    }
  };
}
