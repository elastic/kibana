import moment from 'moment';
import splitInterval from './split_interval.js';

module.exports = function (tlConfig) {
  const min = moment(tlConfig.time.from);
  const max = moment(tlConfig.time.to);

  const intervalParts = splitInterval(tlConfig.time.interval);

  let current = min.startOf(intervalParts.unit);

  const targetSeries = [];

  while (current.valueOf() < max.valueOf()) {
    targetSeries.push(current.valueOf());
    current = current.add(intervalParts.count, intervalParts.unit);
  }

  return targetSeries;
};
