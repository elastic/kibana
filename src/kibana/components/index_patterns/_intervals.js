define(function (require) {
  return function IndexNameIntervalsService(timefilter) {
    var _ = require('lodash');
    var moment = require('moment');

    var intervals = [
      {
        name: 'hours',
        display: 'Hourly'
      },
      {
        name: 'days',
        display: 'Daily'
      },
      {
        name: 'weeks',
        display: 'Weekly'
      },
      {
        name: 'months',
        display: 'Monthly'
      },
      {
        name: 'years',
        display: 'Yearly'
      }
    ];

    intervals.toIndexList = function (format, interval, a, b) {
      var bounds;

      // setup the range that the list will span, return two moment objects that
      // are in proper order. a and b can be numbers to specify to go before or after now (respectively)
      // a certain number of times, based on the interval
      var range = [ [a, 'min'], [b, 'max'] ].map(function (v) {
        var val = v[0];
        var bound = v[1];

        // grab a bound from the time filter
        if (val == null) {
          bounds = bounds || timefilter.getBounds();
          return bounds[bound];
        }

        if (_.isNumeric(val)) return moment().add(interval.name, val);
        if (moment.isMoment(val)) return val;
        return moment(val);
      }).sort(function (a, b) {
        return a - b;
      });

      if (typeof interval === 'string') {
        interval = _.find(intervals, { name: interval });
        if (!interval) throw new Error('Interval must be one of ' + _.pluck(intervals, 'name'));
      }

      var indexList = [];
      var start = range.shift();
      // turn stop into milliseconds to that it's not constantly converted by the while condition
      var stop = range.shift().valueOf();

      while (start <= stop) {
        start.add(interval.name, 1);
        indexList.push(start.format(format));
      }
      return indexList;
    };

    return intervals;
  };
});