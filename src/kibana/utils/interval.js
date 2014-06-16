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
    var rounded = roundInterval(rawInterval);
    if (!round) rounded.interval = rawInterval;
    return rounded;
  };

  // these are the rounding rules used by roundInterval()
  var roundingRules = [
    // bound, interval/desc, format
    ['500ms', '100 ms',      'hh:mm:ss.SSS'],
    ['5s',    'second',      'HH:mm:ss'],
    ['7.5s',  '5 sec',       'HH:mm:ss'],
    ['15s',   '10 sec',      'HH:mm:ss'],
    ['45s',   '30 sec',      'HH:mm:ss'],
    ['3m',    'minute',      'HH:mm'],
    ['9m',    '5 min',       'HH:mm'],
    ['20m',   '10 min',      'HH:mm'],
    ['45m',   '30 min',      'YYYY-MM-DD HH:mm'],
    ['2h',    'hour',        'YYYY-MM-DD HH:mm'],
    ['6h',    '3 hours',     'YYYY-MM-DD HH:mm'],
    ['24h',   '12 hours',    'YYYY-MM-DD HH:mm'],
    ['1w',    '1 day',       'YYYY-MM-DD'],
    ['3w',    '1 week',      'YYYY-MM-DD'],
    ['1y',    '1 month',     'YYYY-MM'],
    [null,    '1 year',      'YYYY'] // default
  ];
  var boundCache = {};

  /**
   * Round a millisecond interval to the closest "clean" interval,
   *
   * @param  {ms} interval - interval in milliseconds
   * @return {[type]}          [description]
   */
  var roundInterval = function (interval) {
    var rule = _.find(roundingRules, function (rule, i, rules) {
      var remaining = rules.length - i - 1;
      // no bound? then succeed
      if (!rule[0]) return true;

      var bound = boundCache[rule[0]] || (boundCache[rule[0]] = toMs(rule[0]));
      // check that we are below or equal to the bounds
      if (remaining > 1 && interval <= bound) return true;
      // the last rule before the default shouldn't include the default (which is the bound)
      if (remaining === 1 && interval < bound) return true;
    });
    return {
      description: rule[1],
      interval: toMs(rule[1]),
      format: rule[2]
    };
  };

  // map of moment's short/long unit ids and elasticsearch's long unit ids
  // to their value in milliseconds
  var vals = _.transform([
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
    var normal = moment.normalizeUnits(units[0]);
    var val = moment.duration(1, normal).asMilliseconds();
    [].concat(normal, units).forEach(function (unit) {
      vals[unit] = val;
    });
  }, {});
  // match any key from the vals object prececed by an optional number
  var parseRE = new RegExp('^(\\d+(?:\\.\\d*)?)?\\s*(' + _.keys(vals).join('|') + ')$');

  // Months and years are not handled here since they have sort of fuzzy values
  var describe = function (intervalString) {
    var totalMs = toMs(intervalString);
    var weeks = parseInt(totalMs / (1000 * 60 * 60 * 24 * 7));
    var days = parseInt((totalMs / (1000 * 60 * 60 * 24))) % 7;
    var hours = parseInt(totalMs / 3600000) % 24;
    var minutes = parseInt(totalMs / 60000) % 60;
    var seconds = parseInt(totalMs / 1000) % 60;
    var ms = totalMs % 1000;

    return  ((weeks ? weeks + 'w ' : '') +
            (days ? days + 'd ' : '') +
            (hours ? hours + 'h ' : '') +
            (minutes ? minutes + 'm ' : '') +
            (seconds ? seconds + 's ' : '') +
            (ms ? ms + 'ms' : '')).trim();
  };

  var toMs = function (expr) {
    var match = expr.match(parseRE);
    if (match) return parseFloat(match[1] || 1) * vals[match[2]];
  };

  return {
    toMs: toMs,
    calculate: calculate,
    describe: describe
  };
});