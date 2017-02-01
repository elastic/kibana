let moment = require('moment');

let splitInterval = require('./split_interval.js');

module.exports = function (tlConfig) {
  let min = moment(tlConfig.time.from);
  let max = moment(tlConfig.time.to);

  let intervalParts = splitInterval(tlConfig.time.interval);

  let current = min.startOf(intervalParts.unit);

  let targetSeries = [];

  while (current.valueOf() < max.valueOf()) {
    targetSeries.push(current.valueOf());
    current = current.add(intervalParts.count, intervalParts.unit);
  }

  return targetSeries;
};
