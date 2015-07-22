var alter = require('../utils/alter.js');
var _ = require('lodash');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'averageWindow',
      types: ['number']
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function movingaverage (inputSeries, averageWindow) {
    return alter([inputSeries, averageWindow], function (args) {

      var pairs = args[0].data;
      var windowSize = args[1];



      args[0].data = _.map(pairs, function(point, i) {


        if (i < windowSize) { return [point[0], null]; }


        var average = _.chain(pairs.slice(i - windowSize, i))
        .map(function (point) {
          return point[1];
        }).reduce(function (memo, num) {
          return (memo + num);
        }).value() / windowSize;

        return [point[0], average];
      });
      return args[0];
    });
  }
};
