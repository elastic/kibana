let alter = require('../lib/alter.js');
let _ = require('lodash');
let Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('derivative', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'Plot the change in values over time.',
  fn: function derivativeFn(args) {
    return alter(args, function (eachSeries) {
      let pairs = eachSeries.data;
      eachSeries.data = _.map(pairs, function (point, i) {
        if (i === 0 || pairs[i - 1][1] == null || point[1] == null) { return [point[0], null]; }
        return [point[0], point[1] - pairs[i - 1][1]];
      });

      return eachSeries;
    });
  }
});
