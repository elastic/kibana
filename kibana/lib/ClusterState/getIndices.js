define(function (require) {
  'use strict';
  var moment = require('moment');
  return function (kbnIndex, dashboard) {
    var to = moment.utc();
    var from = moment.utc().subtract(dashboard.current.index.interval, 3);
    var interval = dashboard.current.index.interval;
    var pattern = dashboard.current.index.pattern;
    return kbnIndex.indices(from, to, pattern, interval);
  };  
});
