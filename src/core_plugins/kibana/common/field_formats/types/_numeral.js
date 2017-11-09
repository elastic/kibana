import _ from 'lodash';
import numeral from '@elastic/numeral';
import { FieldFormat } from '../../../../../ui/field_formats/field_format';

const numeralInst = numeral();

export class Numeral extends FieldFormat {
  _convert(val) {
    if (val === -Infinity) return '-∞';
    if (val === +Infinity) return '+∞';
    if (typeof val !== 'number') {
      val = parseFloat(val);
    }

    if (isNaN(val)) return '';

    return numeralInst.set(val).format(this.param('pattern'));
  }

  static factory(opts) {
    class Class extends Numeral {
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

      static id = opts.id;
      static title = opts.title;
      static fieldType = 'number';
    }

    if (opts.prototype) {
      _.assign(Class.prototype, opts.prototype);
    }

    return Class;
  }
}
