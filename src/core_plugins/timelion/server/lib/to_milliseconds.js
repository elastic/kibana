import _ from 'lodash';
import moment from 'moment';

// map of moment's short/long unit ids and elasticsearch's long unit ids
// to their value in milliseconds
const vals = _.transform([
  ['ms', 'milliseconds', 'millisecond'],
  ['s', 'seconds', 'second', 'sec'],
  ['m', 'minutes', 'minute', 'min'],
  ['h', 'hours', 'hour'],
  ['d', 'days', 'day'],
  ['w', 'weeks', 'week'],
  ['M', 'months', 'month'],
  ['quarter'],
  ['y',  'years', 'year']
], function (vals, units) {
  const normal = moment.normalizeUnits(units[0]);
  const val = moment.duration(1, normal).asMilliseconds();
  [].concat(normal, units).forEach(function (unit) {
    vals[unit] = val;
  });
}, {});
// match any key from the vals object prececed by an optional number
const parseRE = new RegExp('^(\\d+(?:\\.\\d*)?)?\\s*(' + _.keys(vals).join('|') + ')$');

module.exports = function (expr) {
  const match = expr.match(parseRE);
  if (match) {
    if (match[2] === 'M' && match[1] !== '1') {
      throw new Error ('Invalid interval. 1M is only valid monthly interval.');
    }

    return parseFloat(match[1] || 1) * vals[match[2]];
  }
};