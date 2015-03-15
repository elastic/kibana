define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var datemath = require('utils/datemath');

  return function parseInterval(interval) {
    // Assume interval is in the form (value)(unit), such as "1h"
    var regex = new RegExp('^([0-9\\.]*)\\s*(' + datemath.units.join('|') + ')$');
    var matches = regex.exec(interval), value, unit;
    if (matches && matches.length) {
      value = parseFloat(matches[1]) || 1;
      unit = matches[2];
    }

    try {
      interval = moment.duration(value, unit);

      // There is an error with moment, where if you have a fractional interval between 0 and 1, then when you add that
      // interval to an existing moment object, it will remain unchanged, which causes problems in the ordered_x_keys
      // code. To counteract this, we find the first unit that doesn't result in a value between 0 and 1.
      // For example, if you have '0.5d', then when calculating the x-axis series, we take the start date and begin
      // adding 0.5 days until we hit the end date. However, since there is a bug in moment, when you add 0.5 days to
      // the start date, you get the same exact date (instead of being ahead by 12 hours). So instead of returning
      // a duration corresponding to 0.5 hours, we return a duration corresponding to 12 hours.
      var selectedUnit = _.find(datemath.units, function (unit) {
        return Math.abs(interval.as(unit)) >= 1;
      });
      return moment.duration(interval.as(selectedUnit), selectedUnit);
    } catch (e) {
      return null;
    }
  };
});