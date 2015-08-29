var alter = require('../lib/alter.js');
var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('abs', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Return the absolute value of each value in the series list',
  fn: function absFn(args) {
    return alter(args, function (inputSeries) {
      var data = _.map(inputSeries.data, function (point) {
        return [point[0], Math.abs(point[1])];
      });
      inputSeries.data = data;
      return inputSeries;
    });
  }
});
