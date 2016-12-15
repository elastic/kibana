const alter = require('../lib/alter.js');
const _ = require('lodash');
const Chainable = require('../lib/classes/chainable');

const loadFunctions = require('../lib/load_functions.js');
const fitFunctions  = loadFunctions('fit_functions');

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

      const noNulls = _.filter(eachSeries.data, 1);

      eachSeries.data = fitFunctions[mode](noNulls, eachSeries.data);
      return eachSeries;
    });
  }
});
