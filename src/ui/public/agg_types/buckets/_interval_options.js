define(function (require) {
  return function IntervalOptionsService(Private) {
    let moment = require('moment');
    require('ui/directives/input_whole_number');

    // shorthand
    let ms = function (type) { return moment.duration(1, type).asMilliseconds(); };

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
        val: 's'
      },
      {
        display: 'Minute',
        val: 'm'
      },
      {
        display: 'Hourly',
        val: 'h'
      },
      {
        display: 'Daily',
        val: 'd'
      },
      {
        display: 'Weekly',
        val: 'w'
      },
      {
        display: 'Monthly',
        val: 'M'
      },
      {
        display: 'Yearly',
        val: 'y'
      },
      {
        display: 'Custom',
        val: 'custom'
      }
    ];
  };
});
