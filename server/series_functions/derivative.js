var alter = require('../utils/alter.js');
var _ = require('lodash');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function derivative (inputSeries) {
  return alter([inputSeries], function (args) {
      var pairs = args[0].data;
      args[0].data = _.map(pairs, function(point, i) {
        if (i === 0 || pairs[i - 1][1] == null || point[1] == null) { return [point[0], null]; }
        return [point[0], point[1] - pairs[i - 1][1]];
      });

      return args[0];
    });
  }
};
