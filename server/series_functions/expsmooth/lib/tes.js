// Frequency = number of points per season
// Season = 1 hump

/*
Hourly data might have:
 - Daily seasonality (frequency=24)
 - Weekly seasonality (frequency=24×7=168)
 - Annual seasonality (frequency=24×365.25=8766)
*/

var _ = require('lodash');

function initSeasonalComponents(samplePoints, seasonLength) {
  var sampledSeasonCount = samplePoints.length / seasonLength;
  var currentSeason = [];
  var seasonalAverages = _.reduce(samplePoints, (result, point, i) => {
    currentSeason.push(point);
      // If this is the end of the season, add it to the result;
    if (i % seasonLength === seasonLength - 1) {
      result.push(_.sum(currentSeason) / seasonLength);
      currentSeason = [];
    }

    return result;
  }, []);

  var seasonals = _.times(seasonLength, (i) => {
    var sumOfValsOverAvg = 0;
    _.times(sampledSeasonCount, (j) => {
      sumOfValsOverAvg += samplePoints[seasonLength * j + i] - seasonalAverages[j];
    });

    return sumOfValsOverAvg / sampledSeasonCount;
  });

  return seasonals;
};

// This is different from the DES method of establishing trend because it looks for
// the difference in points between seasons
function initTrend(samplePoints, seasonLength) {
  var sum = 0;
  _.times(seasonLength, (i) => {
    sum += (samplePoints[i + seasonLength] - samplePoints[i]) / seasonLength;
  });
  return sum / seasonLength;
}

module.exports = function tes(series, alpha, beta, gamma, seasonLength, seasonsToSample) {

  var times = _.map(series, 0);
  var points = _.map(series, 1);
  var samplePoints = points.slice(0, seasonLength * seasonsToSample);
  var seasonals = initSeasonalComponents(samplePoints, seasonLength);
  var level;
  var trend;

  var result = _.map(points, (point, i) => {
    const seasonalPosition = i % seasonLength;
    let lastLevel;
    // For the first samplePoints.length we use the actual points
    // After that we switch to the forecast
    if (i === 0) {
      trend = initTrend(points, seasonLength);
      level = points[0];
      return points[0];
    }

    // Beta isn't actually used once we're forecasting?
    if (point == null || i >= samplePoints.length) {
      // Don't know this point, make it up!
      const m = i - samplePoints.length + 1;
      console.log(m);
      return (level + (m * trend)) + seasonals[seasonalPosition];
    } else {
      // Not forecasting yet, still have context from sample seasons

      // Basically we're just smoothing here.
      lastLevel = level;
      level = alpha * (point - seasonals[seasonalPosition]) + (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
      seasonals[seasonalPosition] = gamma * (point - level) + (1 - gamma) * seasonals[seasonalPosition];
      return level + trend + seasonals[seasonalPosition];
    }

  });

  return _.zip(times, result);
};
