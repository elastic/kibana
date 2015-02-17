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
        enabled: function (agg) {
          // not only do we need a time field, but the selected field needs
          // to be the time field. (see #3028)
          return agg.fieldIsTimeField();
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