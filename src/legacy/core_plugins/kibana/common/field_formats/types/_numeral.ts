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

// @ts-ignore
import numeral from '@elastic/numeral';
// @ts-ignore
import numeralLanguages from '@elastic/numeral/languages';
import { assign, has } from 'lodash';
import {
  FieldFormat,
  KBN_FIELD_TYPES,
  TextContextTypeConvert,
} from '../../../../../../plugins/data/common/';

const numeralInst = numeral();

numeralLanguages.forEach(function(numeralLanguage: Record<string, any>) {
  numeral.language(numeralLanguage.id, numeralLanguage.lang);
});

export function createNumeralFormat(opts: Record<string, any>) {
  class NumeralFormat extends FieldFormat {
    static id = opts.id;
    static title = opts.title;
    static fieldType = KBN_FIELD_TYPES.NUMBER;

    private getConfig: Function;

    constructor(params: Record<string, any>, getConfig: Function) {
      super(params);
      this.getConfig = getConfig;
    }

    getParamDefaults() {
      if (has(opts, 'getParamDefaults')) {
        return opts.getParamDefaults(this.getConfig);
      }

      return {
        pattern: this.getConfig(`format:${opts.id}:defaultPattern`),
      };
    }

    textConvert: TextContextTypeConvert = val => {
      if (val === -Infinity) return '-∞';
      if (val === +Infinity) return '+∞';
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }

      if (isNaN(val)) return '';

      const previousLocale = numeral.language();
      const defaultLocale =
        (this.getConfig && this.getConfig('format:number:defaultLocale')) || 'en';
      numeral.language(defaultLocale);

      const formatted = numeralInst.set(val).format(this.param('pattern'));

      numeral.language(previousLocale);

      return opts.afterConvert ? opts.afterConvert.call(this, formatted) : formatted;
    };
  }

  if (opts.prototype) {
    assign(NumeralFormat.prototype, opts.prototype);
  }

  return NumeralFormat;
}
