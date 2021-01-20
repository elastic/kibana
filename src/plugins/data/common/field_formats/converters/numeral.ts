/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import numeral from '@elastic/numeral';
// @ts-ignore
import numeralLanguages from '@elastic/numeral/languages';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert } from '../types';
import { UI_SETTINGS } from '../../constants';

const numeralInst = numeral();

numeralLanguages.forEach((numeralLanguage: Record<string, any>) => {
  numeral.language(numeralLanguage.id, numeralLanguage.lang);
});

export abstract class NumeralFormat extends FieldFormat {
  static fieldType = KBN_FIELD_TYPES.NUMBER;

  abstract id: string;
  abstract title: string;

  getParamDefaults = () => ({
    pattern: this.getConfig!(`format:${this.id}:defaultPattern`),
  });

  protected getConvertedValue(val: any): string {
    if (val === -Infinity) return '-∞';
    if (val === +Infinity) return '+∞';
    if (typeof val !== 'number') {
      val = parseFloat(val);
    }

    if (isNaN(val)) return '';

    const previousLocale = numeral.language();
    const defaultLocale =
      (this.getConfig && this.getConfig(UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE)) || 'en';
    numeral.language(defaultLocale);

    const formatted = numeralInst.set(val).format(this.param('pattern'));

    numeral.language(previousLocale);

    return formatted;
  }

  textConvert: TextContextTypeConvert = (val) => {
    return this.getConvertedValue(val);
  };
}
