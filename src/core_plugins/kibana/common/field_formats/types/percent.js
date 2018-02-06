import { createNumeralFormat } from './_numeral';

export function createPercentFormat(FieldFormat) {
  return createNumeralFormat(FieldFormat, {
    id: 'percent',
    title: 'Percentage',
    getParamDefaults: (getConfig) => {
      return {
        pattern: getConfig('format:percent:defaultPattern'),
        fractional: true
      };
    },
    afterConvert(val) {
      return this.param('fractional') ? val : val / 100;
    }
  });
}
