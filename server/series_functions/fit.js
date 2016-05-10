var alter = require('../lib/alter.js');
var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');

var loadFunctions = require('../lib/load_functions.js');
var fitFunctions  = loadFunctions('fit_functions');

module.exports = new Chainable('fit', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'mode',
      types: ['string'],
      help: 'The algorithm to use for fitting the series to the target. One of: ' + _.keys(fitFunctions).join(', ')
    }
  ],
  help: 'Fills null values using a defined fit function',
  fn: function absFn(args) {
    return alter(args, function (eachSeries, mode) {

      var noNulls = _.filter(eachSeries.data, 1);

      eachSeries.data = fitFunctions[mode](noNulls, eachSeries.data);
      return eachSeries;
    });
  }
});
