let alter = require('../lib/alter.js');
let _ = require('lodash');
let Chainable = require('../lib/classes/chainable');

let loadFunctions = require('../lib/load_functions.js');
let fitFunctions  = loadFunctions('fit_functions');

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

      let noNulls = _.filter(eachSeries.data, 1);

      eachSeries.data = fitFunctions[mode](noNulls, eachSeries.data);
      return eachSeries;
    });
  }
});
