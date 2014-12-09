define(function (require) {
  var moment = require('moment');
  return function brushEventProvider(timefilter) {
    return function (event) {
      var from = moment(event.range[0]);
      var to = moment(event.range[1]);

      if (to - from === 0) return;

      timefilter.time.from = from;
      timefilter.time.to = to;
      timefilter.time.mode = 'absolute';
    };
  };
});
