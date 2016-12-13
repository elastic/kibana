const alter = require('../lib/alter.js');
const _ = require('lodash');
const Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('abs', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Return the absolute value of each value in the series list',
  fn: function absFn(args) {
    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], Math.abs(point[1])];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  }
});
