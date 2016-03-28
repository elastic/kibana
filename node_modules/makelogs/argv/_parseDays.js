var _ = require('lodash');
var moment = require('moment');

module.exports = function parseDays(argv) {
  var complexDateRE = /(\-|\+|)\d+,?/g;
  var moments = [];

  var startBase = moment().utc().startOf('day');
  var endBase = moment().utc().endOf('day');


  if (_.isNumber(argv.days)) {
    moments.push(startBase.subtract(argv.days, 'days'));
    moments.push(endBase.add(argv.days, 'days'));
    return moments;
  }

  if (_.isString(argv.days) && argv.days.match(complexDateRE)) {
    var ends = [], match;
    while (ends.length < 2 && (match = complexDateRE.exec(argv.days))) {
      ends.push(match);
    }

    if (ends.length === 1) {
      ends.push(ends[0]);
    }

    if (ends.length === 2) {
      ends = ends.slice(0, 2).map(function (n) { return parseFloat(n); }).sort();
      moments.push(startBase.add('days', ends[0]));
      moments.push(endBase.add('days', ends[1]));
      return moments;
    }
  }

  throw new TypeError('Unable to determine the starting and end dates.');
};
