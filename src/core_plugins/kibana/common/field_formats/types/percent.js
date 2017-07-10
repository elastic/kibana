import _ from 'lodash';
import { Numeral } from './_numeral';

export const PercentFormat = Numeral.factory({
  id: 'percent',
  title: 'Percentage',
  getParamDefaults: (getConfig) => {
    return {
      pattern: getConfig('format:percent:defaultPattern'),
      fractional: true
    };
  },
  prototype: {
    _convert: _.compose(Numeral.prototype._convert, function (val) {
      return this.param('fractional') ? val : val / 100;
    })
  }
});
