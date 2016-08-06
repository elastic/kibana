var _ = require('lodash');

module.exports = function des(series, alpha, beta) {
  var level;
  var prevLevel;
  var trend;
  var prevTrend;
  var value;
  var origin;
  var unknownCount = 0;

  if (series.length < 2) {
    throw new Error ('You need at least 2 points to use double exponential smoothing');
  }

  var times = _.map(series, 0);
  var points = _.map(series, 1);

  var smoothedPoints = _.map(points, (point, i) => {
    if (i === 0) {
      return point;
    }

    if (i === 1) {
      // Establish initial values for level and trend;
      level = points[0];
      trend = points[1] - points[0];
      origin = point;
    }

    if (point == null) {
      unknownCount++;
    } else {
      origin = point;
      unknownCount = 0;
    }

    value = point;
    // These 2 variables are not required, but are used for clarity.
    prevLevel = level;
    prevTrend = trend;
    level = (alpha * origin) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    return (level + (unknownCount * trend));
  }, []);

  return _.zip(times, smoothedPoints);

};
