/*
  Single exponential smoothing. Assuming even interval
*/

import _ from 'lodash';

module.exports = function ses(points, alpha) {
  let origin;
  let level;

  const smoothedPoints = _.reduce(points, (result, point, i) => {
    if (i === 0) {
      origin = point;
      level = point;
    } else {
      // In the case that point[1] is null, we keep origin the same
      // and forecast the point based on the previous smoothed point
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

  return smoothedPoints;
};
