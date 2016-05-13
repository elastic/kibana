var moment = require('moment');

var splitInterval = require('./split_interval.js');

module.exports = function (tlConfig) {
  var min = moment(tlConfig.time.from);
  var max = moment(tlConfig.time.to);

  var intervalParts = splitInterval(tlConfig.time.interval);

  var current = min.startOf(intervalParts.unit);

  var targetSeries = [];

  while (current.valueOf() < max.valueOf()) {
    targetSeries.push(current.valueOf());
    current = current.add(intervalParts.count, intervalParts.unit);
  }

  return targetSeries;
};
