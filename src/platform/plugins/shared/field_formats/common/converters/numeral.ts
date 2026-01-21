/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-ignore
import numeral from '@elastic/numeral';
// @ts-ignore
import numeralLanguages from '@elastic/numeral/languages';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { MISSING_TOKEN, NAN_LABEL, NULL_LABEL } from '@kbn/field-formats-common';
import { FieldFormat } from '../field_format';
import type { HtmlContextTypeConvert, TextContextTypeConvert } from '../types';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';
import { asPrettyString } from '../utils';

const numeralInst = numeral();

numeralLanguages.forEach((numeralLanguage: Record<string, { id: string; lang: string }>) => {
  numeral.language(numeralLanguage.id, numeralLanguage.lang);
});

export abstract class NumeralFormat extends FieldFormat {
  static fieldType = KBN_FIELD_TYPES.NUMBER;

  abstract id: string;
  abstract title: string;

  getParamDefaults = () => ({
    // While this should be always defined, it is not guaranteed in testing that the function is available
    pattern: this.getConfig?.(`format:${this.id}:defaultPattern`),
    alwaysShowSign: false,
  });

  protected getConvertedValue(val: unknown): string {
    const originalVal = val;
    if (val == null || val === MISSING_TOKEN) return NULL_LABEL;
    if (val === -Infinity) return '-∞';
    if (val === +Infinity) return '+∞';
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'string') val = parseFloat(val);

    if (typeof originalVal === 'string' && !Number.isFinite(val)) {
      // if the value is a string that cannot be parsed as a number, try to parse it as a JSON object
      try {
        const parsedVal = JSON.parse(originalVal);
        if (typeof parsedVal === 'object' && parsedVal !== null) {
          return originalVal; // return the original string if it's a JSON object
        }
      } catch {
        // if parsing fails, continue to a next step
      }
    }

    if (!Number.isFinite(val)) return NAN_LABEL;

    const previousLocale = numeral.language();
    const defaultLocale =
      (this.getConfig && this.getConfig(FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE)) || 'en';
    numeral.language(defaultLocale);

    let pattern: string = this.param('pattern');
    if (pattern && this.param('alwaysShowSign')) {
      pattern = pattern.startsWith('+') || val === 0 ? pattern : `+ ${pattern}`;
    }

    const formatted = numeralInst.set(val).format(pattern);

    numeral.language(previousLocale);

    return formatted;
  }

  htmlConvert: HtmlContextTypeConvert = (val) => {
    if (val == null || val === MISSING_TOKEN) {
      return `<span class="ffString__emptyValue">${NULL_LABEL}</span>`;
    }
    if (typeof val === 'object' && !Array.isArray(val)) {
      return asPrettyString(val);
    }
    return this.getConvertedValue(val);
  };

  textConvert: TextContextTypeConvert = (val) => {
    return this.getConvertedValue(val);
  };
}
