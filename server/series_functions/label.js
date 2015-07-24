var alter = require('../utils/alter.js');
var util = require('util');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'label',
      types: ['string']
    }
  ],
  help: 'Change the color of the series',
  fn:  function labelFn (inputSeries, label) {
    return alter([inputSeries, label], function (args) {
      if (args[1].indexOf('%s') !== -1) {
        args[0].label =  util.format(args[1], args[0].label);
      } else {
        args[0].label =  args[1];
      }

      return args[0];
    });
  }
};
