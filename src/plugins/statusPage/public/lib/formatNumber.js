
var moment = require('moment');
var numeral = require('numeral');

module.exports = function formatNumber(num, which) {
  var format = '0.00';
  var postfix = '';
  switch (which) {
    case 'time':
      return moment(num).format('HH:mm:ss');
    case 'byte':
      format += ' b';
      break;
    case 'ms':
      postfix = ' ms';
      break;
  }
  return numeral(num).format(format) + postfix;
};
