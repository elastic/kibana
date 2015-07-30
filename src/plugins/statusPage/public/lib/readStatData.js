var _ = require('lodash');

module.exports = function readStatData(data, seriesNames) {
  // Metric Values format
  // metric: [[xValue, yValue], ...]
  // LoadMetric:
  // metric: [[xValue, [yValue, yValue2, yValue3]], ...]
  // return [
  //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue}, ...]},
  //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue1}, ...]},
  //    {type: 'line', key: name, yAxis: 1, values: [{x: xValue, y: yValue2}, ...]}]
  //
  // Go through all of the metric values and split the values out.
  // returns an array of all of the averages

  var metricList = [];
  seriesNames = seriesNames || [];
  data.forEach(function (vector) {
    vector = _.flatten(vector);
    var x = vector.shift();
    vector.forEach(function (yValue, i) {
      var series = seriesNames[i] || '';

      if (!metricList[i]) {
        metricList[i] = {
          key: series,
          values: []
        };
      }
      // unshift to make sure they're in the correct order
      metricList[i].values.unshift({
        x: x,
        y: yValue
      });
    });
  });

  return metricList;
};
