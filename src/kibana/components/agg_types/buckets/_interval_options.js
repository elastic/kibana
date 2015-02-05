define(function (require) {
  return function IntervalOptionsService(Private) {
    var moment = require('moment');
    require('directives/input_whole_number');

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
        val: 'second'
      },
      {
        display: 'Minute',
        val: 'minute'
      },
      {
        display: 'Hourly',
        val: 'hour'
      },
      {
        display: 'Daily',
        val: 'day'
      },
      {
        display: 'Weekly',
        val: 'week'
      },
      {
        display: 'Monthly',
        val: 'month'
      },
      {
        display: 'Yearly',
        val: 'year'
      }
    ];
  };
});