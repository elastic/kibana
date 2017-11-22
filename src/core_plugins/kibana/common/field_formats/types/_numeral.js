import _ from 'lodash';
import numeral from '@elastic/numeral';

const numeralInst = numeral();

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

      const formatted = numeralInst.set(val).format(this.param('pattern'));

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
