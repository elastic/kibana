define(function (require) {
  var moment = require('moment');
  var _ = require('lodash');
  return function changeTimeFilterProvider(timefilter) {
    return function (filter) {
      var key = _.keys(filter.range)[0];
      var values = filter.range[key];
      timefilter.time.from = moment(values.gt || values.gte);
      timefilter.time.to = moment(values.lt || values.lte);
      timefilter.time.mode = 'absolute';
    };
  };
});
