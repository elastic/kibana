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

import _ from 'lodash';
import numeral from '@elastic/numeral';
import numeralLanguages from '@elastic/numeral/languages';

const numeralInst = numeral();

numeralLanguages.forEach(function (numeralLanguage) {
  numeral.language(numeralLanguage.id, numeralLanguage.lang);
});

export function createNumeralFormat(FieldFormat, opts) {
  class NumeralFormat extends FieldFormat {
    static id = opts.id;
    static title = opts.title;
    static fieldType = 'number';

    constructor(params, getConfig) {
      super(params);
      this.getConfig = getConfig;
    }

    getParamDefaults() {
      if (_.has(opts, 'getParamDefaults')) {
        return opts.getParamDefaults(this.getConfig);
      }

      return {
        pattern: this.getConfig(`format:${opts.id}:defaultPattern`)
      };
    }

    _convert(val) {
      if (val === -Infinity) return '-∞';
      if (val === +Infinity) return '+∞';
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }

      if (isNaN(val)) return '';

      const previousLocale = numeral.language();
      const defaultLocale = this.getConfig && this.getConfig('format:number:defaultLocale') || 'en';
      numeral.language(defaultLocale);

      const formatted = numeralInst.set(val).format(this.param('pattern'));

      numeral.language(previousLocale);

      return opts.afterConvert
        ? opts.afterConvert.call(this, formatted)
        : formatted;
    }
  }

  if (opts.prototype) {
    _.assign(NumeralFormat.prototype, opts.prototype);
  }

  return NumeralFormat;
}
