/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// import { i18n } from '@kbn/i18n';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert } from '../types';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';

export abstract class IntlNumberFormat extends FieldFormat {
  static fieldType = KBN_FIELD_TYPES.NUMBER;

  abstract id: string;
  abstract title: string;

  getParamDefaults = () => ({});

  abstract getArguments: () => Record<string, unknown>;

  protected getConvertedValue(val: any): string {
    if (val === -Infinity) return '-∞';
    if (val === +Infinity) return '+∞';
    if (typeof val !== 'number') {
      val = parseFloat(val);
    }

    if (isNaN(val)) return '';

    const defaultLocale = this.getConfig && this.getConfig('format:defaultLocale');
    let locales = [defaultLocale, 'en'];
    if (defaultLocale === 'detect') {
      locales = navigator.languages
        ? navigator.languages.concat(['en'])
        : [navigator.language].concat(locales);
    }
    // const locale = (this.getConfig && this.getConfig('format:defaultLocale')) || 'en';
    // if (locale === 'detect') {
    //   locale =
    // }

    const inst = new Intl.NumberFormat(locales, this.getArguments());

    return inst.format(val);
  }

  textConvert: TextContextTypeConvert = val => {
    return this.getConvertedValue(val);
  };
}
