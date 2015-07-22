var alter = require('../utils/alter.js');
var _ = require('lodash');
module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Return the absolute value of each value in the series list',
  fn: function abs (inputSeries) {
    return alter([inputSeries], function (args) {
      var data = _.map(args[0].data, function (point) {
        return [point[0], Math.abs(point[1])];
      });
      args[0].data = data;
      return args[0];
    });
  }
};
