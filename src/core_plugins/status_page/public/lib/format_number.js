
import moment from 'moment';
import numeral from 'numeral';

export default function formatNumber(num, which) {
  let format = '0.00';
  let postfix = '';
  switch (which) {
    case 'time':
      return moment(num).format('HH:mm:ss');
    case 'byte':
      format += ' b';
      break;
    case 'ms':
      postfix = ' ms';
      break;
    case 'integer':
      format = '0';
      break;
  }
  return numeral(num).format(format) + postfix;
}
