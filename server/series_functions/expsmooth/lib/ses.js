/*
  Single exponential smoothing. Assuming even interval
*/

const _ = require('lodash');

module.exports = function ses(series, alpha) {
  let origin;
  let level;

  var times = _.map(series, 0);
  var points = _.map(series, 1);

  var smoothedPoints = _.reduce(points, (result, point, i) => {
    if (i === 0) {
      origin = point;
      level = point;
    } else {
      // In the case that point[1] is null, we keep origin the same
      // and forecast the point
      if (point != null) {
        origin = point;
      }
      if (origin == null) {
        level = null;
      } else {
        const prevSmoothed = result[i - 1];
        level = alpha * origin + (1 - alpha) * prevSmoothed;
      }
    }

    result.push(level);
    return result;
  }, []);

  return _.zip(times, smoothedPoints);
};
