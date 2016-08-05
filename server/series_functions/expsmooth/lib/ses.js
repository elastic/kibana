/*
  Single exponential smoothing. Assuming even interval
*/

const _ = require('lodash');

module.exports = function ses(series, alpha) {
  let origin;
  let level;

  return _.reduce(series, (result, point, i) => {
    if (i === 0) {
      origin = point[1];
      level = point[1];
    } else {
      // In the case that point[1] is null, we keep origin the same
      // and forecast the point
      if (point[1] != null) {
        origin = point[1];
      }
      if (origin == null) {
        level = null;
      } else {
        const prevSmoothed = result[i - 1][1];
        level = alpha * origin + (1 - alpha) * prevSmoothed;
      }
    }

    result.push([point[0], level]);
    return result;
  }, []);
};
