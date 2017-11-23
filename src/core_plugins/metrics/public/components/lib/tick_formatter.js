import numeral from '@elastic/numeral';
import handlebars from 'handlebars/dist/handlebars';
import { durationInputOptions } from './durations';
import { capitalize, isNumber } from 'lodash';

import { createDurationFormat } from '../../../../kibana/common/field_formats/types/duration';
import { FieldFormat } from '../../../../../ui/field_formats/field_format';

const DurationFormat = createDurationFormat(FieldFormat);

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

const durationsLookup = durationInputOptions.reduce((acc, row) => {
  acc[row.value] = row.label;
  return acc;
}, {});

export default (format = '0,0.[00]', template) => {
  if (!template) template = '{{value}}';
  const render = handlebars.compile(template);
  const durationFormatTest = /[pnumshdwMY]+,[pnumshdwMY]+,\d+/;
  return (val) => {
    const formatString = formatLookup[format] || format;
    let value;
    if (!isNumber(val)) {
      value = 0;
    } else {
      if (durationFormatTest.test(format)) {
        const [from, to, decimals] = format.split(',');
        const inputFormat = durationsLookup[from];
        const outputFormat = `as${capitalize(durationsLookup[to])}`;
        const formatter = new DurationFormat({
          inputFormat,
          outputFormat,
          outputPrecision: decimals
        });
        value = formatter.convert(val, 'text');
      } else {
        try {
          value = numeral(val).format(formatString);
        } catch (e) {
          value = val;
        }
      }
    }
    try {
      return render({ value });
    } catch (e) {
      return String(value);
    }
  };
};
