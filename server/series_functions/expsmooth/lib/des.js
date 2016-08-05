var _ = require('lodash');

module.exports = function des(series, alpha, beta) {
  var level;
  var lastLevel;
  var trend;
  var value;
  var origin;
  var lastKnownPoint;

  if (series.length < 2) {
    throw new Error ('You need at least 2 points to use double exponential smoothing');
  }

  var times = _.map(series, 0);
  var points = _.map(series, 1);

  var smoothedPoints = _.reduce(points, (result, point, i) => {
    if (i === 0) {
      result.push(point);
      return result;
    }

    if (i === 1) {
      level = points[0];
      trend = points[1] - points[0];

      // We need at least 2 known values to use DES anyway,
      // so don't bother setting this until we have 2
      lastKnownPoint = point;
    }

    if (point == null) {
      origin = lastKnownPoint;
    } else {
      origin = point;
    }

    value = point;
    lastLevel = level;
    level = alpha * origin + (1 - alpha) * (level + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    result.push(level + trend);
    return result;
  }, []);

  return _.zip(times, smoothedPoints);

};
