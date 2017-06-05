import numeral from '@spalger/numeral';
import _ from 'lodash';
import handlebars from 'handlebars/dist/handlebars';

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

export default (format = '0,0.[00]', template) => {
  if (!template) template = '{{value}}';
  const render = handlebars.compile(template);
  return (val) => {
    const formatString = formatLookup[format] || format;
    let value;
    if (!_.isNumber(val)) {
      value = 0;
    } else {
      try {
        value = numeral(val).format(formatString);
      } catch (e) {
        value = val;
      }
    }
    try {
      return render({ value });
    } catch (e) {
      return String(value);
    }
  };
};
