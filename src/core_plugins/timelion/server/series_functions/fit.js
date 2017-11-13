import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
import loadFunctions from '../lib/load_functions.js';
const fitFunctions  = loadFunctions('fit_functions');

export default new Chainable('fit', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'mode',
      types: ['string'],
      help: `The algorithm to use for fitting the series to the target. One of: ${_.keys(fitFunctions).join(', ')}`,
      suggestions: _.keys(fitFunctions).map(key => {
        return { name: key };
      })
    }
  ],
  help: 'Fills null values using a defined fit function',
  fn: function absFn(args) {
    return alter(args, function (eachSeries, mode) {

      const noNulls = eachSeries.data.filter((item) => (item[1] === 0 || item[1]));

      if (noNulls.length === 0) {
        return eachSeries;
      }

      eachSeries.data = fitFunctions[mode](noNulls, eachSeries.data);
      return eachSeries;
    });
  }
});
