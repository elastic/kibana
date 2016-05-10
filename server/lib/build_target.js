var moment = require('moment');

var splitInterval = require('./split_interval.js');

module.exports = function (tlConfig) {
  var min = tlConfig.time.from;
  var max = tlConfig.time.to;

  var intervalParts = splitInterval(tlConfig.time.interval);

  var current = moment(min).startOf(intervalParts.unit).valueOf();
  var targetSeries = [];

  while (current < max) {
    targetSeries.push(current);
    current = moment(current).add(intervalParts.count, intervalParts.unit).valueOf();
  }

  return targetSeries;
};

