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
