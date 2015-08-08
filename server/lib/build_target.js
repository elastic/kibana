var moment = require('moment');

function splitInterval (interval) {
  if (!interval.match(/[0-9]+[mshdwMy]/g)) {
    throw new Error ('Malformed `interval`: ' + interval);
  }
  var parts = interval.match(/[0-9]+|[msdwMy]/g);

  return {
    count: parts[0],
    unit: parts[1]
  };
}

module.exports = function (tlConfig) {
  var min = tlConfig.time.min;
  var max = tlConfig.time.max;

  var intervalParts = splitInterval(tlConfig.time.interval);

  var current = moment(min).startOf(intervalParts.unit).valueOf();
  var targetSeries = [];

  while (current < max) {
    targetSeries.push(current);
    current = moment(current).add(intervalParts.count, intervalParts.unit).valueOf();
  }

  return targetSeries;
};

