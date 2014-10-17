define(function (require) {
  return function IntervalOptionsService(Private) {
    var moment = require('moment');

    // shorthand
    var ms = function (type) { return moment.duration(1, type).asMilliseconds(); };

    return [
      {
        display: 'Auto',
        val: 'auto',
        enabled: function (aggConfig) {
          return !!aggConfig.vis.indexPattern.timeFieldName;
        }
      },
      {
        display: 'Second',
        val: 'second',
        ms: ms('second')
      },
      {
        display: 'Minute',
        val: 'minute',
        ms: ms('minute')
      },
      {
        display: 'Hourly',
        val: 'hour',
        ms: ms('hour')
      },
      {
        display: 'Daily',
        val: 'day',
        ms: ms('day')
      },
      {
        display: 'Weekly',
        val: 'week',
        ms: ms('week')
      },
      {
        display: 'Monthly',
        val: 'month',
        ms: ms('month')
      },
      {
        display: 'Yearly',
        val: 'year',
        ms: ms('year')
      }
    ];
  };
});