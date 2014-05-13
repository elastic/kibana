define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var datemath = require('utils/datemath');

  /**
    * Calculate a graph interval
    *
    * from::           Moment object containing the start time
    * to::             Moment object containing the finish time
    * target::         Calculate to approximately this many bars
    * round::          Round to a nice value (default: true)
    *
    *
    */
  var calculate = function (from, to, target, round) {
    var rawInterval;
    round = round || true;
    from = datemath.parse(from).valueOf();
    to = datemath.parse(to, true).valueOf();
    rawInterval = ((to - from) / target);
    return round ? roundInterval(rawInterval) : rawInterval;
  };

  // interval should be passed in ms
  var roundInterval = function (interval) {
    switch (true) {
    case (interval <=   toMS('500ms')):
      return {interval: toMS('100ms'), format: 'hh:mm:ss.SSS'};
    case (interval <=   toMS('5s')):
      return {interval: toMS('1s'), format: 'hh:mm:ss'};
    case (interval <=   toMS('7.5s')):
      return {interval: toMS('5s'), format: 'hh:mm:ss'};
    case (interval <=   toMS('15s')):
      return {interval: toMS('10s'), format: 'hh:mm:ss'};
    case (interval <=   toMS('45s')):
      return {interval: toMS('30s'), format: 'hh:mm:ss'};
    case (interval <=   toMS('3m')):
      return {interval: toMS('1m'), format: 'hh:mm'};
    case (interval <=   toMS('9m')):
      return {interval: toMS('5m'), format: 'hh:mm'};
    case (interval <=   toMS('20m')):
      return {interval: toMS('10m'), format: 'hh:mm'};
    case (interval <=   toMS('45m')):
      return {interval: toMS('30m'), format: 'yyyy-MM-dd hh:mm'};
    case (interval <=   toMS('2h')):
      return {interval: toMS('1h'), format: 'yyyy-MM-dd hh:mm'};
    case (interval <=   toMS('6h')):
      return {interval: toMS('3h'), format: 'yyyy-MM-dd hh:mm'};
    case (interval <=   toMS('24h')):
      return {interval: toMS('12h'), format: 'yyyy-MM-dd hh:mm'};
    case (interval <=   toMS('1w')):
      return {interval: toMS('1d'), format: 'yyyy-MM-dd'};
    case (interval <=   toMS('3w')):
      return {interval: toMS('1w'), format: 'yyyy-MM-dd'};
    case (interval <    toMS('1y')):
      return {interval: toMS('1M'), format: 'yyyy-MM'};
    default:
      return {interval: toMS('1y'), format: 'yyyy'};
    }
  };

  var toMS = function (interval) {
    var _p = interval.match(/([0-9.]+)([a-zA-Z]+)/);
    if (_p.length !== 3) return undefined;
    return moment.duration(parseFloat(_p[1]), shorthand[_p[2]]).valueOf();
  };

  var shorthand = {
    ms: 'milliseconds',
    s:  'seconds',
    m:  'minutes',
    h:  'hours',
    d:  'days',
    w:  'weeks',
    M:  'months',
    y:  'years',
  };

  return {
    toMS: toMS,
    calculate: calculate
  };
});